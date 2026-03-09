import { Request, Response, NextFunction } from "express";
import { firebaseAuth, firestore, ALLOWED_EMAILS_CONFIG_DOC } from "../config.js";

function parseAllowedList(envValue: string | undefined): string[] | null {
  if (!envValue) return null;
  const parsed = envValue.split(",").map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
  return parsed.length > 0 ? parsed : null;
}

const allowedDomains = parseAllowedList(process.env.ALLOWED_EMAIL_DOMAINS);
const allowedEmails = parseAllowedList(process.env.ALLOWED_EMAILS);

if (!allowedDomains && !allowedEmails) {
  console.warn("WARNING: ALLOWED_EMAIL_DOMAINS and ALLOWED_EMAILS are not set. Any authenticated user can auto-provision as staff.");
}

function isEmailAllowedByEnv(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  if (allowedEmails?.includes(lowerEmail)) return true;
  if (!allowedDomains) return !allowedEmails;
  const domain = lowerEmail.split("@")[1];
  return !!domain && allowedDomains.includes(domain);
}

async function isEmailAllowed(email: string): Promise<boolean> {
  const lowerEmail = email.toLowerCase();

  // Firestoreの設定を優先チェック
  try {
    const doc = await firestore.doc(ALLOWED_EMAILS_CONFIG_DOC).get();
    if (doc.exists) {
      const data = doc.data()!;
      const fsEmails = (data.emails as string[]) ?? [];
      const fsDomains = (data.domains as string[]) ?? [];

      // 片方でも設定がある場合はFirestore設定を使用（両方空の場合は環境変数にフォールバック）
      if (fsEmails.length > 0 || fsDomains.length > 0) {
        if (fsEmails.includes(lowerEmail)) return true;
        const domain = lowerEmail.split("@")[1];
        return !!domain && fsDomains.includes(domain);
      }
      // Firestoreドキュメントは存在するが両方空 → 環境変数にフォールバック
    }
  } catch (err) {
    console.error("Failed to read Firestore allowed emails config, falling back to env", (err as Error).message);
  }

  // Firestoreに設定がない場合は環境変数にフォールバック
  return isEmailAllowedByEnv(email);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header with Bearer token is required" });
    return;
  }

  const idToken = authHeader.slice(7);

  // Step 1: Firebase IDトークン検証（revoke チェック有効、失敗 → 401）
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken, true);
  } catch (err) {
    const code = (err as Error & { code?: string }).code;
    if (code === "auth/id-token-revoked") {
      res.status(401).json({ error: "Token has been revoked" });
    } else if (code === "auth/id-token-expired") {
      res.status(401).json({ error: "Invalid or expired token" });
    } else if (code === "auth/argument-error" || code === "auth/invalid-id-token") {
      res.status(401).json({ error: "Invalid or expired token" });
    } else {
      // auth/internal-error, auth/project-not-found, network errors, etc.
      console.error("Token verification failed", JSON.stringify({ code, message: (err as Error).message }));
      res.status(401).json({ error: "Authentication failed" });
    }
    return;
  }

  // Step 1.5: ユーザーアカウントの無効化チェック
  try {
    const userRecord = await firebaseAuth.getUser(decoded.uid);
    if (userRecord.disabled) {
      res.status(401).json({ error: "User account is disabled" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Authentication failed" });
    return;
  }

  // Step 2: Firestoreからスタッフ情報取得/作成（失敗 → 500）
  try {
    const staffCollection = firestore.collection("staff");
    let staffId: string;
    let role: "admin" | "staff";
    let staffName = "";

    // Step 2a: doc(uid) を一次ソースとして検索（新規ユーザーはuid=docId）
    const primaryDoc = await staffCollection.doc(decoded.uid).get();

    if (primaryDoc.exists) {
      const data = primaryDoc.data()!;
      if (data.disabled) {
        res.status(403).json({ error: "Your account has been disabled" });
        return;
      }
      staffId = primaryDoc.id;
      role = (data.role as "admin" | "staff") ?? "staff";
      staffName = (data.name as string) ?? "";
    } else {
      // Step 2b: レガシー互換 — firebaseUidフィールドで検索（limit なし）
      const legacyQuery = await staffCollection
        .where("firebaseUid", "==", decoded.uid)
        .get();

      if (legacyQuery.size > 1) {
        // 重複レコード検出 → fail closed
        console.error("Duplicate staff records for firebaseUid", {
          uid: decoded.uid,
          count: legacyQuery.size,
          docIds: legacyQuery.docs.map((d) => d.id),
        });
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      if (legacyQuery.size === 1) {
        // レガシーレコード発見
        const staffDoc = legacyQuery.docs[0];
        if (staffDoc.data().disabled) {
          res.status(403).json({ error: "Your account has been disabled" });
          return;
        }
        staffId = staffDoc.id;
        role = (staffDoc.data().role as "admin" | "staff") ?? "staff";
        staffName = (staffDoc.data().name as string) ?? "";
      } else {
        // 未登録ユーザーのアクセス制御
        if (!decoded.email) {
          res.status(403).json({ error: "Email is required for auto-provisioning" });
          return;
        }
        if (!decoded.email_verified) {
          res.status(403).json({ error: "Email not verified" });
          return;
        }
        if (!(await isEmailAllowed(decoded.email))) {
          res.status(403).json({ error: "Access denied: email domain not allowed" });
          return;
        }

        // Auto-provision: 初回ログイン時にstaffドキュメントを自動作成
        // firebaseUidをドキュメントIDに使い、create()で冪等に作成（競合対策）
        const newStaffRef = staffCollection.doc(decoded.uid);
        try {
          await newStaffRef.create({
            firebaseUid: decoded.uid,
            email: decoded.email ?? "",
            name: decoded.name ?? "",
            role: "staff",
            createdAt: new Date(),
          });
          staffId = newStaffRef.id;
          role = "staff";
          staffName = decoded.name ?? "";
        } catch (provisionErr: unknown) {
          const code = (provisionErr as { code?: number }).code;
          if (code === 6) {
            // ALREADY_EXISTS: 同時リクエストが先に作成済み
            const existingDoc = await newStaffRef.get();
            const existingData = existingDoc.data();
            if (!existingData) {
              throw new Error("Staff document exists but has no data");
            }
            if (existingData.disabled) {
              res.status(403).json({ error: "Your account has been disabled" });
              return;
            }
            staffId = existingDoc.id;
            role = (existingData.role as "admin" | "staff") ?? "staff";
            staffName = (existingData.name as string) ?? "";
          } else {
            throw provisionErr;
          }
        }
      }
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: staffName,
      role,
      staffId,
    };

    next();
  } catch (err) {
    console.error("Staff lookup/provision failed", {
      uid: decoded.uid,
      error: (err as Error).message,
      code: (err as { code?: number }).code,
    });
    res.status(500).json({ error: "Internal server error" });
  }
}

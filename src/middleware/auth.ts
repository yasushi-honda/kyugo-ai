import { Request, Response, NextFunction } from "express";
import { firebaseAuth } from "../config.js";
import { firestore } from "../config.js";

const parsedDomains = process.env.ALLOWED_EMAIL_DOMAINS
  ? process.env.ALLOWED_EMAIL_DOMAINS.split(",").map((d) => d.trim().toLowerCase()).filter((d) => d.length > 0)
  : null;
const allowedDomains = parsedDomains && parsedDomains.length > 0 ? parsedDomains : null;

if (!allowedDomains) {
  console.warn("WARNING: ALLOWED_EMAIL_DOMAINS is not set. Any authenticated user can auto-provision as staff.");
}

function isEmailAllowed(email: string): boolean {
  if (!allowedDomains) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowedDomains.includes(domain);
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
      console.error("Token verification failed", { code, message: (err as Error).message });
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

    // Step 2a: doc(uid) を一次ソースとして検索（新規ユーザーはuid=docId）
    const primaryDoc = await staffCollection.doc(decoded.uid).get();

    if (primaryDoc.exists) {
      const data = primaryDoc.data()!;
      staffId = primaryDoc.id;
      role = (data.role as "admin" | "staff") ?? "staff";
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
        staffId = staffDoc.id;
        role = (staffDoc.data().role as "admin" | "staff") ?? "staff";
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
        if (!isEmailAllowed(decoded.email)) {
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
        } catch (provisionErr: unknown) {
          const code = (provisionErr as { code?: number }).code;
          if (code === 6) {
            // ALREADY_EXISTS: 同時リクエストが先に作成済み
            const existingDoc = await newStaffRef.get();
            const existingData = existingDoc.data();
            if (!existingData) {
              throw new Error("Staff document exists but has no data");
            }
            staffId = existingDoc.id;
            role = (existingData.role as "admin" | "staff") ?? "staff";
          } else {
            throw provisionErr;
          }
        }
      }
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? "",
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

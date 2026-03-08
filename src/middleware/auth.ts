import { Request, Response, NextFunction } from "express";
import { firebaseAuth } from "../config.js";
import { firestore } from "../config.js";

const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS
  ? process.env.ALLOWED_EMAIL_DOMAINS.split(",").map((d) => d.trim().toLowerCase())
  : null;

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

  // Step 1: Firebase IDトークン検証（失敗 → 401）
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("expired") || message.includes("Decoding Firebase ID token failed")) {
      res.status(401).json({ error: "Invalid or expired token" });
    } else {
      res.status(401).json({ error: "Authentication failed" });
    }
    return;
  }

  // Step 2: Firestoreからスタッフ情報取得/作成（失敗 → 500）
  try {
    const staffQuery = await firestore
      .collection("staff")
      .where("firebaseUid", "==", decoded.uid)
      .limit(1)
      .get();

    let staffId: string;
    let role: "admin" | "staff";

    if (staffQuery.empty) {
      // 未登録ユーザーのアクセス制御
      if (!decoded.email_verified) {
        res.status(403).json({ error: "Email not verified" });
        return;
      }
      if (!isEmailAllowed(decoded.email ?? "")) {
        res.status(403).json({ error: "Access denied: email domain not allowed" });
        return;
      }

      // Auto-provision: 初回ログイン時にstaffドキュメントを自動作成
      // firebaseUidをドキュメントIDに使い、create()で冪等に作成（競合対策）
      const newStaffRef = firestore.collection("staff").doc(decoded.uid);
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
    } else {
      const staffDoc = staffQuery.docs[0];
      const staffData = staffDoc.data();
      staffId = staffDoc.id;
      role = (staffData.role as "admin" | "staff") ?? "staff";
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

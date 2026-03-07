import { Request, Response, NextFunction } from "express";
import { firebaseAuth } from "../config.js";
import { firestore } from "../config.js";
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header with Bearer token is required" });
    return;
  }

  const idToken = authHeader.slice(7);
  try {
    const decoded = await firebaseAuth.verifyIdToken(idToken);

    // Firestoreのstaffコレクションからユーザー情報を取得
    const staffQuery = await firestore
      .collection("staff")
      .where("firebaseUid", "==", decoded.uid)
      .limit(1)
      .get();

    let staffId: string;
    let role: "admin" | "staff";

    if (staffQuery.empty) {
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
    const message = (err as Error).message;
    if (message.includes("expired") || message.includes("Decoding Firebase ID token failed")) {
      res.status(401).json({ error: "Invalid or expired token" });
    } else {
      res.status(401).json({ error: "Authentication failed" });
    }
  }
}

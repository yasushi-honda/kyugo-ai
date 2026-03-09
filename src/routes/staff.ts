import { Router, Request, Response } from "express";
import { firestore } from "../config.js";

export const staffRouter = Router();

// GET /api/staff - 職員一覧（id+name のみ返却）
staffRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const snapshot = await firestore.collection("staff").get();
    const staff = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data().name as string) ?? "",
    }));
    res.json(staff);
  } catch (err) {
    console.error("Staff list failed", (err as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
});

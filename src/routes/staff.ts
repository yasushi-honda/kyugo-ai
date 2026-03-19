import { Router, Request, Response } from "express";
import { logger } from "../utils/logger.js";
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
    logger.error("Staff list failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

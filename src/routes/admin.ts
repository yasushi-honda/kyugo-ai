import { Router, Request, Response } from "express";
import { retryPendingConsultations } from "../services/ai-retry.js";

export const adminRouter = Router();

// POST /api/admin/retry-ai - AIリトライ実行（Cloud Scheduler用）
adminRouter.post("/retry-ai", async (req: Request, res: Response) => {
  // シークレットヘッダーによる認証（Cloud Scheduler / admin手動実行用）
  const retrySecret = process.env.AI_RETRY_SECRET;
  const secret = req.headers["x-retry-secret"];
  if (!retrySecret || secret !== retrySecret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const result = await retryPendingConsultations();
    console.log("AI retry completed:", result);
    res.json(result);
  } catch (err) {
    console.error("AI retry failed:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

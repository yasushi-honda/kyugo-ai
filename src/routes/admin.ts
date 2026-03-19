import { Router, Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { retryPendingConsultations } from "../services/ai-retry.js";

export const adminRouter = Router();

// admin全エンドポイント共通: シークレットヘッダー認証ミドルウェア
function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const retrySecret = process.env.AI_RETRY_SECRET;
  const secret = req.headers["x-retry-secret"];
  if (!retrySecret || secret !== retrySecret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

adminRouter.use(requireAdminSecret);

// POST /api/admin/retry-ai - AIリトライ実行（Cloud Scheduler用）
adminRouter.post("/retry-ai", async (_req: Request, res: Response) => {
  try {
    const result = await retryPendingConsultations();
    logger.info("AI retry completed", { result });
    res.json(result);
  } catch (err) {
    logger.error("AI retry failed", { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

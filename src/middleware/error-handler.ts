import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

/**
 * 統一エラーハンドラ
 * 未処理のエラーをキャッチし、内部エラーメッセージの漏洩を防止する。
 * Express 5ではasyncルートハンドラのエラーも自動的にここに到達する。
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error("Unhandled error", {
    error: err.message,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    method: req.method,
    path: req.path,
  });

  // すでにレスポンスを送信開始している場合はスキップ
  if (res.headersSent) {
    return;
  }

  res.status(500).json({ error: "Internal server error" });
}

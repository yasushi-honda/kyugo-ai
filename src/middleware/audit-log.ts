import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

/**
 * 監査ログミドルウェア
 * APIリクエストの完了時にCloud Logging互換のJSON監査ログを出力する。
 * 個人情報（リクエストボディ）は記録しない。
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on("finish", () => {
    // /health, 静的ファイルは除外
    if (!req.path.startsWith("/api")) return;

    const duration = Date.now() - startTime;
    const staffId = req.user?.staffId ?? "anonymous";
    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;

    logger.info("audit", {
      "logging.googleapis.com/labels": { type: "audit" },
      audit: {
        staffId,
        method,
        path,
        statusCode,
        durationMs: duration,
        ip: req.ip ?? req.socket.remoteAddress ?? "unknown",
        userAgent: req.get("user-agent") ?? "unknown",
      },
    });
  });

  next();
}

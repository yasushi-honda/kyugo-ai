import { Request } from "express";
import rateLimit from "express-rate-limit";

// 注意: MemoryStore（デフォルト）を使用しているため、Cloud Run マルチインスタンス環境では
// インスタンスごとに独立したカウンターになる。厳密な分散レートリミットが必要な場合は
// Cloud Armor または Redis ストアを検討すること。

const ONE_MINUTE_MS = 60 * 1_000;

const baseConfig = {
  windowMs: ONE_MINUTE_MS,
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
};

// デフォルト: 1分あたり100リクエスト（IPベース）
export const defaultLimiter = rateLimit({
  ...baseConfig,
  limit: 100,
  message: { error: "Too many requests, please try again later" },
});

// AI系エンドポイント: 1分あたり10リクエスト（staffIdベース）
// 新規AIルート追加時は必ず aiLimiter を適用すること
export const aiLimiter = rateLimit({
  ...baseConfig,
  limit: 10,
  keyGenerator: (req: Request) => req.user?.staffId ?? req.ip ?? "unknown",
  message: { error: "Too many AI requests, please try again later" },
});

import rateLimit from "express-rate-limit";

// デフォルト: 1分あたり100リクエスト
export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// AI系エンドポイント: 1分あたり10リクエスト
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many AI requests, please try again later" },
});

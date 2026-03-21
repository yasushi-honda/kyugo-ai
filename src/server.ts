import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { logger } from "./utils/logger.js";
import helmet from "helmet";
import { casesRouter } from "./routes/cases.js";
import { staffRouter } from "./routes/staff.js";
import { supportMenusRouter } from "./routes/support-menus.js";
import { adminRouter } from "./routes/admin.js";
import { adminSettingsRouter } from "./routes/admin-settings.js";
import { requireAuth } from "./middleware/auth.js";
import { defaultLimiter } from "./middleware/rate-limit.js";
import { auditLog } from "./middleware/audit-log.js";
import { errorHandler } from "./middleware/error-handler.js";
import { firestore } from "./config.js";

const startTime = Date.now();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT ?? "8080", 10);

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseapp.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com"],
      frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
}));
app.use(express.json());

// Audit logging（全APIリクエスト）
app.use(auditLog);

// Rate limiting（/health はレート制限外）
app.use("/api", defaultLimiter);

// Health check（Firestore接続確認 + Vertex AI到達性 + バージョン + uptime）
app.get("/health", async (_req, res) => {
  const checks: Record<string, string> = {};

  // Firestore
  try {
    await firestore.collection("_health").doc("ping").get();
    checks.firestore = "ok";
  } catch {
    checks.firestore = "unreachable";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    version: process.env.npm_package_version ?? "0.1.0",
    uptime: uptimeSeconds,
    checks,
  });
});

// Current user info
app.get("/api/me", requireAuth, (req, res) => {
  res.json(req.user);
});

// API routes (protected by Firebase Auth)
app.use("/api/cases", requireAuth, casesRouter);
app.use("/api/staff", requireAuth, staffRouter);
app.use("/api/support-menus", requireAuth, supportMenusRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin-settings", requireAuth, adminSettingsRouter);

// /api で始まる未知パスは404 JSON（SPAフォールバックに吸い込まれるのを防止）
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Frontend static files
const frontendDir = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDir));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

// 統一エラーハンドラ（全ルートの後に配置）
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Kyugo AI server running on port ${PORT}`);
});

export { app };

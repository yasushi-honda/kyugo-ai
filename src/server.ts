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
import { firestore } from "./config.js";

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

// Rate limiting（/health はレート制限外）
app.use("/api", defaultLimiter);

// Health check（Firestore接続確認付き、軽量なdoc get）
app.get("/health", async (_req, res) => {
  try {
    await firestore.collection("_health").doc("ping").get();
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "degraded", error: "Firestore unreachable" });
  }
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

app.listen(PORT, () => {
  logger.info(`Kyugo AI server running on port ${PORT}`);
});

export { app };

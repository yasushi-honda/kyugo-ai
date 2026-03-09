import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { casesRouter } from "./routes/cases.js";
import { staffRouter } from "./routes/staff.js";
import { supportMenusRouter } from "./routes/support-menus.js";
import { adminRouter } from "./routes/admin.js";
import { requireAuth } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT ?? "8080", 10);

app.use(express.json());

// Firebase Auth signInWithPopup に必要（COOPがポップアップのwindow.closedアクセスをブロックする）
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
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
  console.log(`Kyugo AI server running on port ${PORT}`);
});

export { app };

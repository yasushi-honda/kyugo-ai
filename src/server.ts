import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { casesRouter } from "./routes/cases.js";
import { supportMenusRouter } from "./routes/support-menus.js";
import { requireAuth } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT ?? "8080", 10);

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes (protected by Firebase Auth)
app.use("/api/cases", requireAuth, casesRouter);
app.use("/api/support-menus", requireAuth, supportMenusRouter);

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

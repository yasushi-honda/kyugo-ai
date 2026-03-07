import express from "express";
import { casesRouter } from "./routes/cases.js";
import { supportMenusRouter } from "./routes/support-menus.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "8080", 10);

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api/cases", casesRouter);
app.use("/api/support-menus", supportMenusRouter);

app.listen(PORT, () => {
  console.log(`Kyugo AI server running on port ${PORT}`);
});

export { app };

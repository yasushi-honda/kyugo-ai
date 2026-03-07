import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock dependencies (same as server.ts requires)
vi.mock("./config.js", () => ({
  firestore: { collection: vi.fn() },
  generativeModel: { generateContent: vi.fn() },
  PROJECT_ID: "test-project",
  REGION: "asia-northeast1",
  MODEL: "gemini-2.5-flash",
}));

vi.mock("./repositories/case-repository.js", () => ({
  createCase: vi.fn(),
  getCase: vi.fn(),
  listCasesByStaff: vi.fn(),
  updateCaseStatus: vi.fn(),
}));

vi.mock("./repositories/consultation-repository.js", () => ({
  createConsultation: vi.fn(),
  getConsultation: vi.fn(),
  listConsultations: vi.fn(),
  updateConsultationAIResults: vi.fn(),
}));

vi.mock("./repositories/support-menu-repository.js", () => ({
  getSupportMenu: vi.fn(),
  listSupportMenus: vi.fn(),
}));

vi.mock("./services/ai.js", () => ({
  analyzeConsultation: vi.fn(),
  analyzeAudioConsultation: vi.fn(),
}));

// Build a test app that mirrors server.ts static serving setup
// but uses frontend/dist which exists in the repo
import { casesRouter } from "./routes/cases.js";
import { supportMenusRouter } from "./routes/support-menus.js";

const frontendDir = path.join(__dirname, "../frontend/dist");
const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/cases", casesRouter);
app.use("/api/support-menus", supportMenusRouter);
app.use(express.static(frontendDir));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

describe("Static file serving", () => {
  it("serves index.html at /", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("<!doctype html>");
  });

  it("serves SPA fallback for unknown paths", async () => {
    const res = await request(app).get("/cases/unknown-id");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("<!doctype html>");
  });

  it("API routes take priority over static fallback", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("serves static assets from frontend/dist", async () => {
    const res = await request(app).get("/").expect(200);
    // index.html references JS/CSS assets
    expect(res.text).toContain("/assets/");
  });
});

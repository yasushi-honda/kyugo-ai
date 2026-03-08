import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import os from "os";
import express from "express";

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

import { casesRouter } from "./routes/cases.js";
import { supportMenusRouter } from "./routes/support-menus.js";

let tmpDir: string;
let app: express.Express;

const TEST_HTML = '<!doctype html><html lang="ja"><head><title>Test</title></head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>';

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kyugo-static-test-"));
  fs.mkdirSync(path.join(tmpDir, "assets"));
  fs.writeFileSync(path.join(tmpDir, "index.html"), TEST_HTML);
  fs.writeFileSync(path.join(tmpDir, "assets", "app.js"), "console.log('test')");

  app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/cases", casesRouter);
  app.use("/api/support-menus", supportMenusRouter);
  // /api で始まるパスはSPAフォールバック対象外
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(express.static(tmpDir));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(tmpDir, "index.html"));
  });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
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

  it("serves static assets directly", async () => {
    const res = await request(app).get("/assets/app.js");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/javascript/);
  });

  it("returns 404 JSON for unknown /api/* paths instead of SPA fallback", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.error).toBe("Not found");
  });

  it("returns 404 JSON for /api/cases/unknown/nonexistent subpath", async () => {
    const res = await request(app).get("/api/unknown-endpoint/sub");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});

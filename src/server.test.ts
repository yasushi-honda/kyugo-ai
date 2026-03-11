import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// Mock dependencies before importing routes
vi.mock("./config.js", () => ({
  ALLOWED_EMAILS_CONFIG_DOC: "config/allowedEmails",
  firestore: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  generativeModel: {
    generateContent: vi.fn(),
  },
  firebaseAuth: {
    verifyIdToken: vi.fn(),
    getUser: vi.fn(),
  },
  PROJECT_ID: "test-project",
  REGION: "asia-northeast1",
  MODEL: "gemini-2.5-flash",
}));

vi.mock("./repositories/case-repository.js", () => ({
  createCase: vi.fn(),
  getCase: vi.fn(),
  listCasesByStaff: vi.fn(),
  listAllCases: vi.fn(),
  updateCaseStatus: vi.fn(),
}));

vi.mock("./repositories/consultation-repository.js", () => ({
  createConsultation: vi.fn(),
  getConsultation: vi.fn(),
  listConsultations: vi.fn(),
  updateConsultationAIResults: vi.fn(),
  updateConsultationAIStatus: vi.fn(),
  updateConsultationAudioPath: vi.fn(),
  listRetryPendingConsultations: vi.fn(),
  expireRetryPendingConsultations: vi.fn(),
}));

vi.mock("./repositories/support-menu-repository.js", () => ({
  getSupportMenu: vi.fn(),
  listSupportMenus: vi.fn(),
}));

vi.mock("./repositories/support-plan-repository.js", () => ({
  createSupportPlan: vi.fn(),
  getSupportPlan: vi.fn(),
  getLatestSupportPlan: vi.fn(),
  listSupportPlans: vi.fn(),
  updateSupportPlan: vi.fn(),
}));

vi.mock("./repositories/monitoring-repository.js", () => ({
  createMonitoringSheet: vi.fn(),
  getMonitoringSheet: vi.fn(),
  getLatestMonitoringSheet: vi.fn(),
  listMonitoringSheets: vi.fn(),
  updateMonitoringSheet: vi.fn(),
}));

vi.mock("./services/ai.js", () => ({
  analyzeConsultation: vi.fn(),
  analyzeAudioConsultation: vi.fn(),
  generateSupportPlanDraft: vi.fn(),
  generateMonitoringDraft: vi.fn(),
}));

vi.mock("./services/audio-storage.js", () => ({
  uploadAudio: vi.fn().mockResolvedValue("cases/case-1/consultations/c-1/audio.wav"),
  downloadAudio: vi.fn().mockResolvedValue({ buffer: Buffer.from("fake"), mimeType: "audio/wav" }),
}));

vi.mock("./services/ai-retry.js", () => ({
  retryPendingConsultations: vi.fn(),
}));

import { casesRouter } from "./routes/cases.js";
import { supportMenusRouter } from "./routes/support-menus.js";
import { staffRouter } from "./routes/staff.js";
import { adminRouter } from "./routes/admin.js";
import { adminSettingsRouter } from "./routes/admin-settings.js";
import { requireAuth } from "./middleware/auth.js";
import { retryPendingConsultations } from "./services/ai-retry.js";
import * as caseRepo from "./repositories/case-repository.js";
import * as consultationRepo from "./repositories/consultation-repository.js";
import * as supportMenuRepo from "./repositories/support-menu-repository.js";
import { analyzeConsultation, analyzeAudioConsultation, generateSupportPlanDraft, generateMonitoringDraft } from "./services/ai.js";
import * as supportPlanRepo from "./repositories/support-plan-repository.js";
import * as monitoringRepo from "./repositories/monitoring-repository.js";
import { Timestamp } from "@google-cloud/firestore";
import { firebaseAuth, firestore } from "./config.js";

// Fake user for route tests (routes now require req.user)
const FAKE_USER = { uid: "test-uid", email: "test@test.com", name: "テスト職員", role: "staff" as const, staffId: "staff-1" };
const FAKE_ADMIN = { uid: "admin-uid", email: "admin@test.com", name: "管理者", role: "admin" as const, staffId: "admin-staff" };

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.user = FAKE_USER; next(); });
app.use("/api/cases", casesRouter);
app.use("/api/staff", staffRouter);
app.use("/api/support-menus", supportMenusRouter);
app.use("/api/admin-settings", adminSettingsRouter);

// App with admin user
const adminApp = express();
adminApp.use(express.json());
adminApp.use((req, _res, next) => { req.user = FAKE_ADMIN; next(); });
adminApp.use("/api/cases", casesRouter);
adminApp.use("/api/admin-settings", adminSettingsRouter);

// App with auth middleware for integration tests
const authApp = express();
authApp.use(express.json());
authApp.get("/api/me", requireAuth, (req, res) => {
  res.json(req.user);
});
authApp.use("/api/cases", requireAuth, casesRouter);
authApp.use("/api/support-menus", requireAuth, supportMenusRouter);

const NOW = Timestamp.now();
const MOCK_CASE = {
  id: "case-1",
  clientName: "テスト太郎",
  clientId: "client-001",
  dateOfBirth: NOW,
  householdInfo: {},
  incomeInfo: {},
  status: "active" as const,
  assignedStaffId: "staff-1",
  createdAt: NOW,
  updatedAt: NOW,
};

const OTHER_STAFF_CASE = {
  ...MOCK_CASE,
  id: "case-other",
  assignedStaffId: "other-staff",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user is not disabled
  vi.mocked(firebaseAuth.getUser).mockResolvedValue({ disabled: false } as never);
});

describe("GET /health", () => {
  const healthApp = express();
  healthApp.get("/health", (_req, res) => res.json({ status: "ok" }));

  it("returns ok", async () => {
    const res = await request(healthApp).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("GET /api/me", () => {
  it("returns user info when authenticated", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "uid-me",
      email: "me@example.com",
    } as never);

    const staffDoc = {
      id: "staff-me-001",
      data: () => ({ role: "admin", name: "Me", email: "me@example.com" }),
    };
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: false, size: 1, docs: [staffDoc] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({ doc: mockDoc, where: mockWhere } as never);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      uid: "uid-me",
      email: "me@example.com",
      name: "Me",
      role: "admin",
      staffId: "staff-me-001",
    });
  });

  it("returns 401 without auth header", async () => {
    const res = await request(authApp).get("/api/me");
    expect(res.status).toBe(401);
  });

  it("auto-provisions staff doc when not found in Firestore", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "uid-new",
      email: "new@example.com",
      email_verified: true,
      name: "New User",
    } as never);

    const mockCreate = vi.fn().mockResolvedValue(undefined);
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ id: "uid-new", get: mockDocGet, create: mockCreate });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({ doc: mockDoc, where: mockWhere } as never);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      uid: "uid-new",
      email: "new@example.com",
      name: "New User",
      role: "staff",
      staffId: "uid-new",
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: "uid-new",
      email: "new@example.com",
      role: "staff",
    }));
  });

  it("returns 500 when Firestore query fails", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "uid-err",
      email: "err@example.com",
    } as never);

    const mockDocGet = vi.fn().mockRejectedValue(new Error("Firestore unavailable"));
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    vi.mocked(firestore.collection).mockReturnValue({ doc: mockDoc } as never);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });

  it("returns 401 with revoked message for auth/id-token-revoked", async () => {
    const err = new Error("Token revoked") as Error & { code: string };
    err.code = "auth/id-token-revoked";
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(err);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer revoked-token");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Token has been revoked");
  });

  it("returns 401 with expired message for auth/id-token-expired", async () => {
    const err = new Error("Token expired") as Error & { code: string };
    err.code = "auth/id-token-expired";
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(err);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer expired-token");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("returns 401 with invalid message for auth/argument-error", async () => {
    const err = new Error("Invalid token") as Error & { code: string };
    err.code = "auth/argument-error";
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(err);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer malformed-token");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("returns 401 with generic message for unknown auth errors", async () => {
    const err = new Error("Network error") as Error & { code: string };
    err.code = "auth/internal-error";
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(err);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer bad-token");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication failed");
  });
});

describe("POST /api/cases", () => {
  it("creates a case with staffId from authenticated user", async () => {
    vi.mocked(caseRepo.createCase).mockResolvedValue(MOCK_CASE);

    const res = await request(app).post("/api/cases").send({
      clientName: "テスト太郎",
      clientId: "client-001",
      dateOfBirth: "1990-01-01",
    });

    expect(res.status).toBe(201);
    expect(res.body.clientName).toBe("テスト太郎");
    expect(vi.mocked(caseRepo.createCase)).toHaveBeenCalledWith(
      expect.objectContaining({ assignedStaffId: "staff-1" }),
    );
  });

  it("returns 400 if required fields missing", async () => {
    const res = await request(app).post("/api/cases").send({});
    expect(res.status).toBe(400);
  });

  it("returns 500 when repository throws", async () => {
    vi.mocked(caseRepo.createCase).mockRejectedValue(new Error("Firestore unavailable"));

    const res = await request(app).post("/api/cases").send({
      clientName: "テスト",
      clientId: "client-001",
      dateOfBirth: "1990-01-01",
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Firestore unavailable");
  });

  it("returns 400 for invalid dateOfBirth format", async () => {
    const res = await request(app).post("/api/cases").send({
      clientName: "テスト",
      clientId: "client-001",
      dateOfBirth: "not-a-date",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Date must be YYYY-MM-DD format");
  });

  it("returns 400 for impossible date (2025-13-45)", async () => {
    const res = await request(app).post("/api/cases").send({
      clientName: "テスト",
      clientId: "client-001",
      dateOfBirth: "2025-13-45",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-existent date that JS auto-corrects (2025-02-31)", async () => {
    const res = await request(app).post("/api/cases").send({
      clientName: "テスト",
      clientId: "client-001",
      dateOfBirth: "2025-02-31",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid date");
  });

  it("returns 400 for April 31st (2025-04-31)", async () => {
    const res = await request(app).post("/api/cases").send({
      clientName: "テスト",
      clientId: "client-001",
      dateOfBirth: "2025-04-31",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when clientName is empty string", async () => {
    const res = await request(app).post("/api/cases").send({
      clientName: "",
      clientId: "client-001",
      dateOfBirth: "1990-01-01",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when dateOfBirth is missing", async () => {
    const res = await request(app).post("/api/cases").send({
      clientName: "テスト",
      clientId: "client-001",
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/cases", () => {
  it("returns cases for authenticated staff", async () => {
    vi.mocked(caseRepo.listCasesByStaff).mockResolvedValue([MOCK_CASE]);

    const res = await request(app).get("/api/cases");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(vi.mocked(caseRepo.listCasesByStaff)).toHaveBeenCalledWith("staff-1");
  });

  it("admin can filter by staffId query param", async () => {
    vi.mocked(caseRepo.listCasesByStaff).mockResolvedValue([MOCK_CASE]);

    const res = await request(adminApp).get("/api/cases?staffId=staff-1");
    expect(res.status).toBe(200);
    expect(vi.mocked(caseRepo.listCasesByStaff)).toHaveBeenCalledWith("staff-1");
  });

  it("admin gets all cases when no staffId specified", async () => {
    vi.mocked(caseRepo.listAllCases).mockResolvedValue([MOCK_CASE, OTHER_STAFF_CASE]);

    const res = await request(adminApp).get("/api/cases");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(vi.mocked(caseRepo.listAllCases)).toHaveBeenCalledWith();
  });
});

describe("GET /api/cases/:id", () => {
  it("returns a case when user is assigned", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

    const res = await request(app).get("/api/cases/case-1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("case-1");
  });

  it("returns 404 if not found", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(null);

    const res = await request(app).get("/api/cases/nonexistent");
    expect(res.status).toBe(404);
  });

  it("returns 403 if staff is not assigned to case", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(OTHER_STAFF_CASE);

    const res = await request(app).get("/api/cases/case-other");
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Access denied");
  });

  it("admin can access any case", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(OTHER_STAFF_CASE);

    const res = await request(adminApp).get("/api/cases/case-other");
    expect(res.status).toBe(200);
  });

  it("returns 500 when getCase throws in requireCaseAccess", async () => {
    vi.mocked(caseRepo.getCase).mockRejectedValue(new Error("Firestore unavailable"));

    const res = await request(app).get("/api/cases/case-1");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Firestore unavailable");
  });
});

describe("PATCH /api/cases/:id/status", () => {
  it("updates case status", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(caseRepo.updateCaseStatus).mockResolvedValue({ ...MOCK_CASE, status: "closed" });

    const res = await request(app).patch("/api/cases/case-1/status").send({ status: "closed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("closed");
  });

  it("returns 400 for invalid transition", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(caseRepo.updateCaseStatus).mockRejectedValue(new Error("Invalid status transition"));

    const res = await request(app).patch("/api/cases/case-1/status").send({ status: "active" });
    expect(res.status).toBe(400);
  });

  it("returns 400 if status field is missing", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

    const res = await request(app).patch("/api/cases/case-1/status").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("status must be one of");
  });

  it("returns 404 if case not found", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(null);

    const res = await request(app).patch("/api/cases/nonexistent/status").send({ status: "closed" });
    expect(res.status).toBe(404);
  });

  it("returns 403 if staff is not assigned", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(OTHER_STAFF_CASE);

    const res = await request(app).patch("/api/cases/case-other/status").send({ status: "closed" });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid status enum value", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

    const res = await request(app).patch("/api/cases/case-1/status").send({ status: "invalid_status" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("status must be one of");
  });
});

describe("POST /api/cases/:id/consultations", () => {
  it("creates consultation with staffId from authenticated user", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-1",
      caseId: "case-1",
      staffId: "staff-1",
      content: "家賃の支払いが困難",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "counter",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
    vi.mocked(analyzeConsultation).mockResolvedValue({ summary: "要約", suggestedSupports: [] });

    const res = await request(app).post("/api/cases/case-1/consultations").send({
      content: "家賃の支払いが困難",
      consultationType: "counter",
    });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("家賃の支払いが困難");
    expect(vi.mocked(consultationRepo.createConsultation)).toHaveBeenCalledWith(
      "case-1",
      expect.objectContaining({ staffId: "staff-1" }),
    );
  });

  it("returns 404 if case not found", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(null);

    const res = await request(app).post("/api/cases/nonexistent/consultations").send({
      content: "test",
      consultationType: "counter",
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 if staff is not assigned", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(OTHER_STAFF_CASE);

    const res = await request(app).post("/api/cases/case-other/consultations").send({
      content: "test",
      consultationType: "counter",
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 if required fields missing", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

    const res = await request(app).post("/api/cases/case-1/consultations").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("required");
  });

  it("returns 500 when repository throws", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockRejectedValue(new Error("DB connection failed"));

    const res = await request(app).post("/api/cases/case-1/consultations").send({
      content: "テスト",
      consultationType: "counter",
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB connection failed");
  });

  it("returns 400 for invalid consultationType", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

    const res = await request(app).post("/api/cases/case-1/consultations").send({
      content: "テスト",
      consultationType: "email",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("consultationType must be one of");
  });

  it("sets aiStatus to retry_pending on transient AI error (429)", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-transient",
      caseId: "case-1",
      staffId: "staff-1",
      content: "テスト",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "counter",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
    const transientErr = new Error("Too Many Requests") as Error & { status: number };
    transientErr.status = 429;
    vi.mocked(analyzeConsultation).mockRejectedValue(transientErr);
    vi.mocked(consultationRepo.updateConsultationAIStatus).mockResolvedValue();

    const res = await request(app).post("/api/cases/case-1/consultations").send({
      content: "テスト",
      consultationType: "counter",
    });
    expect(res.status).toBe(201);

    // fire-and-forgetのPromiseが解決するのを待つ
    await new Promise((r) => setTimeout(r, 50));

    expect(vi.mocked(consultationRepo.updateConsultationAIStatus)).toHaveBeenCalledWith(
      "case-1",
      "cons-transient",
      "retry_pending",
      "Too Many Requests",
      0,
      expect.objectContaining({ _seconds: expect.any(Number) }),
    );
  });

  it("sets aiStatus to error on permanent AI error (400)", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-permanent",
      caseId: "case-1",
      staffId: "staff-1",
      content: "テスト",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "counter",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
    const permanentErr = new Error("Invalid request") as Error & { status: number };
    permanentErr.status = 400;
    vi.mocked(analyzeConsultation).mockRejectedValue(permanentErr);
    vi.mocked(consultationRepo.updateConsultationAIStatus).mockResolvedValue();

    const res = await request(app).post("/api/cases/case-1/consultations").send({
      content: "テスト",
      consultationType: "counter",
    });
    expect(res.status).toBe(201);

    await new Promise((r) => setTimeout(r, 50));

    expect(vi.mocked(consultationRepo.updateConsultationAIStatus)).toHaveBeenCalledWith(
      "case-1",
      "cons-permanent",
      "error",
      "Invalid request",
      0,
      undefined,
    );
  });

  it("returns consultation with aiStatus pending", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-status",
      caseId: "case-1",
      staffId: "staff-1",
      content: "テスト",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "counter",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
    vi.mocked(analyzeConsultation).mockResolvedValue({ summary: "要約", suggestedSupports: [] });

    const res = await request(app).post("/api/cases/case-1/consultations").send({
      content: "テスト",
      consultationType: "counter",
    });
    expect(res.status).toBe(201);
    expect(res.body.aiStatus).toBe("pending");
  });

  it("accepts online consultationType", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-2",
      caseId: "case-1",
      staffId: "staff-1",
      content: "オンライン相談内容",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "online",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
    vi.mocked(analyzeConsultation).mockResolvedValue({ summary: "要約", suggestedSupports: [] });

    const res = await request(app).post("/api/cases/case-1/consultations").send({
      content: "オンライン相談内容",
      consultationType: "online",
    });
    expect(res.status).toBe(201);
  });
});

describe("POST /api/cases/:id/consultations/audio", () => {
  it("saves consultation first and returns immediately (AI runs async)", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-audio-1",
      caseId: "case-1",
      staffId: "staff-1",
      content: "訪問相談",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "visit",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });

    const res = await request(app)
      .post("/api/cases/case-1/consultations/audio")
      .field("consultationType", "visit")
      .field("context", "訪問相談")
      .attach("audio", Buffer.from("fake-audio-data"), { filename: "recording.wav", contentType: "audio/wav" });

    expect(res.status).toBe(201);
    // 非同期化: レスポンスはpending状態の相談記録（AI結果は後から更新）
    expect(res.body.aiStatus).toBe("pending");
    expect(res.body.transcript).toBe("");
    expect(res.body.summary).toBe("");
    expect(vi.mocked(consultationRepo.createConsultation)).toHaveBeenCalledWith(
      "case-1",
      expect.objectContaining({ staffId: "staff-1", content: "訪問相談", transcript: "" }),
    );
  });

  it("returns 404 if case not found", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/cases/nonexistent/consultations/audio")
      .field("consultationType", "visit")
      .attach("audio", Buffer.from("fake"), { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(404);
  });

  it("returns 400 if no audio file", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

    const res = await request(app)
      .post("/api/cases/case-1/consultations/audio")
      .field("consultationType", "visit");

    expect(res.status).toBe(400);
  });

  it("returns 400 if required fields missing", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

    const res = await request(app)
      .post("/api/cases/case-1/consultations/audio")
      .attach("audio", Buffer.from("fake"), { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(400);
  });

  it("returns 403 if staff is not assigned", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(OTHER_STAFF_CASE);

    const res = await request(app)
      .post("/api/cases/case-other/consultations/audio")
      .field("consultationType", "visit")
      .attach("audio", Buffer.from("fake"), { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(403);
  });

  it("calls updateConsultationAIResults with transcript on AI success", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-audio-ok",
      caseId: "case-1",
      staffId: "staff-1",
      content: "訪問相談",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "visit",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
    vi.mocked(analyzeAudioConsultation).mockResolvedValue({
      transcript: "文字起こし結果",
      summary: "要約結果",
      suggestedSupports: [],
    });
    vi.mocked(consultationRepo.updateConsultationAIResults).mockResolvedValue();

    const res = await request(app)
      .post("/api/cases/case-1/consultations/audio")
      .field("consultationType", "visit")
      .field("context", "訪問相談")
      .attach("audio", Buffer.from("fake-audio"), { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(201);

    // fire-and-forgetのPromiseが解決するのを待つ
    await new Promise((r) => setTimeout(r, 50));

    expect(vi.mocked(consultationRepo.updateConsultationAIResults)).toHaveBeenCalledWith(
      "case-1",
      "cons-audio-ok",
      "要約結果",
      [],
      "文字起こし結果",
    );
  });

  it("sets aiStatus to retry_pending on transient audio AI error", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-audio-err",
      caseId: "case-1",
      staffId: "staff-1",
      content: "訪問相談",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "visit",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
    const transientErr = new Error("Service Unavailable") as Error & { status: number };
    transientErr.status = 503;
    vi.mocked(analyzeAudioConsultation).mockRejectedValue(transientErr);
    vi.mocked(consultationRepo.updateConsultationAIStatus).mockResolvedValue();

    const res = await request(app)
      .post("/api/cases/case-1/consultations/audio")
      .field("consultationType", "visit")
      .field("context", "訪問相談")
      .attach("audio", Buffer.from("fake-audio"), { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(201);

    await new Promise((r) => setTimeout(r, 50));

    expect(vi.mocked(consultationRepo.updateConsultationAIStatus)).toHaveBeenCalledWith(
      "case-1",
      "cons-audio-err",
      "retry_pending",
      "Service Unavailable",
      0,
      expect.objectContaining({ _seconds: expect.any(Number) }),
    );
  });

  it("sets aiStatus to error on permanent audio AI error (400)", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-audio-perm",
      caseId: "case-1",
      staffId: "staff-1",
      content: "訪問相談",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "visit",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
    const permanentErr = new Error("Invalid audio format") as Error & { status: number };
    permanentErr.status = 400;
    vi.mocked(analyzeAudioConsultation).mockRejectedValue(permanentErr);
    vi.mocked(consultationRepo.updateConsultationAIStatus).mockResolvedValue();

    const res = await request(app)
      .post("/api/cases/case-1/consultations/audio")
      .field("consultationType", "visit")
      .field("context", "訪問相談")
      .attach("audio", Buffer.from("fake-audio"), { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(201);

    await new Promise((r) => setTimeout(r, 50));

    expect(vi.mocked(consultationRepo.updateConsultationAIStatus)).toHaveBeenCalledWith(
      "case-1",
      "cons-audio-perm",
      "error",
      "Invalid audio format",
      0,
      undefined,
    );
  });

  it("returns 400 for invalid consultationType in audio upload", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

    const res = await request(app)
      .post("/api/cases/case-1/consultations/audio")
      .field("consultationType", "invalid_type")
      .attach("audio", Buffer.from("fake"), { filename: "test.wav", contentType: "audio/wav" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("consultationType must be one of");
  });
});

describe("GET /api/cases/:id/consultations", () => {
  it("returns consultation list", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.listConsultations).mockResolvedValue([]);

    const res = await request(app).get("/api/cases/case-1/consultations");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 when repository throws", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.listConsultations).mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/cases/case-1/consultations");
    expect(res.status).toBe(500);
  });

  it("returns 403 if staff is not assigned", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(OTHER_STAFF_CASE);

    const res = await request(app).get("/api/cases/case-other/consultations");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/cases/:id/consultations/:consultationId", () => {
  it("returns a consultation", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.getConsultation).mockResolvedValue({
      id: "cons-1",
      caseId: "case-1",
      staffId: "staff-1",
      content: "テスト",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "counter",
      aiStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });

    const res = await request(app).get("/api/cases/case-1/consultations/cons-1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("cons-1");
  });

  it("returns 404 if not found", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(consultationRepo.getConsultation).mockResolvedValue(null);

    const res = await request(app).get("/api/cases/case-1/consultations/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/support-menus", () => {
  it("returns menu list", async () => {
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([
      { id: "menu-1", name: "生活保護", category: "生活支援", eligibility: "", description: "", relatedLaws: [], updatedAt: NOW },
    ]);

    const res = await request(app).get("/api/support-menus");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("生活保護");
  });

  it("passes category filter", async () => {
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);

    const res = await request(app).get("/api/support-menus?category=住居支援");
    expect(res.status).toBe(200);
    expect(supportMenuRepo.listSupportMenus).toHaveBeenCalledWith("住居支援");
  });
});

describe("API authentication integration", () => {
  it("returns 401 on /api/cases without Authorization header", async () => {
    const res = await request(authApp).get("/api/cases");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authorization header with Bearer token is required");
  });

  it("returns 401 on /api/support-menus without Authorization header", async () => {
    const res = await request(authApp).get("/api/support-menus");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authorization header with Bearer token is required");
  });

  it("returns 401 on POST /api/cases without Authorization header", async () => {
    const res = await request(authApp).post("/api/cases").send({
      clientName: "テスト",
      clientId: "client-001",
      dateOfBirth: "1990-01-01",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/support-menus/:id", () => {
  it("returns a menu", async () => {
    vi.mocked(supportMenuRepo.getSupportMenu).mockResolvedValue({
      id: "menu-1", name: "生活保護", category: "生活支援", eligibility: "", description: "", relatedLaws: [], updatedAt: NOW,
    });

    const res = await request(app).get("/api/support-menus/menu-1");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("生活保護");
  });

  it("returns 404 if not found", async () => {
    vi.mocked(supportMenuRepo.getSupportMenu).mockResolvedValue(null);

    const res = await request(app).get("/api/support-menus/nonexistent");
    expect(res.status).toBe(404);
  });
});

// ============================================================
// GET /api/staff
// ============================================================
describe("GET /api/staff", () => {
  it("returns staff list with id and name", async () => {
    const mockDocs = [
      { id: "staff-1", data: () => ({ name: "テスト職員", email: "test@test.com", role: "staff" }) },
      { id: "staff-2", data: () => ({ name: "管理者", email: "admin@test.com", role: "admin" }) },
    ];
    const mockGet = vi.fn().mockResolvedValue({ docs: mockDocs });
    vi.mocked(firestore.collection).mockReturnValue({ get: mockGet } as never);

    const res = await request(app).get("/api/staff");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: "staff-1", name: "テスト職員" },
      { id: "staff-2", name: "管理者" },
    ]);
  });

  it("returns empty array when no staff", async () => {
    const mockGet = vi.fn().mockResolvedValue({ docs: [] });
    vi.mocked(firestore.collection).mockReturnValue({ get: mockGet } as never);

    const res = await request(app).get("/api/staff");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 when Firestore fails", async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error("Firestore unavailable"));
    vi.mocked(firestore.collection).mockReturnValue({ get: mockGet } as never);

    const res = await request(app).get("/api/staff");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

// ============================================================
// POST /api/admin/retry-ai
// ============================================================
describe("POST /api/admin/retry-ai", () => {
  const RETRY_SECRET = "test-retry-secret";
  let retryApp: ReturnType<typeof express>;

  beforeEach(() => {
    vi.stubEnv("AI_RETRY_SECRET", RETRY_SECRET);
    // adminRouterは環境変数を起動時に読むため、テスト用appで直接マウント
    retryApp = express();
    retryApp.use(express.json());
    retryApp.use("/api/admin", adminRouter);
  });

  it("returns 403 without secret header", async () => {
    const res = await request(retryApp).post("/api/admin/retry-ai");
    expect(res.status).toBe(403);
  });

  it("returns 403 with wrong secret", async () => {
    const res = await request(retryApp)
      .post("/api/admin/retry-ai")
      .set("x-retry-secret", "wrong-secret");
    expect(res.status).toBe(403);
  });

  it("returns 403 when AI_RETRY_SECRET env var is not set", async () => {
    vi.stubEnv("AI_RETRY_SECRET", "");
    const noSecretApp = express();
    noSecretApp.use(express.json());
    noSecretApp.use("/api/admin", adminRouter);

    const res = await request(noSecretApp)
      .post("/api/admin/retry-ai")
      .set("x-retry-secret", "any-value");
    expect(res.status).toBe(403);
  });

  it("executes retry and returns result with correct secret", async () => {
    vi.mocked(retryPendingConsultations).mockResolvedValue({
      processed: 2, succeeded: 1, failed: 1, expired: 0, recovered: 0, recoveredPending: 0,
    });

    const res = await request(retryApp)
      .post("/api/admin/retry-ai")
      .set("x-retry-secret", RETRY_SECRET);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ processed: 2, succeeded: 1, failed: 1, expired: 0, recovered: 0, recoveredPending: 0 });
  });

  it("returns 500 when retry throws", async () => {
    vi.mocked(retryPendingConsultations).mockRejectedValue(new Error("DB connection failed"));

    const res = await request(retryApp)
      .post("/api/admin/retry-ai")
      .set("x-retry-secret", RETRY_SECRET);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB connection failed");
  });
});

// ============================================================
// GET /api/admin-settings/allowed-emails
// ============================================================
describe("GET /api/admin-settings/allowed-emails", () => {
  it("returns 403 for non-admin user", async () => {
    const res = await request(app).get("/api/admin-settings/allowed-emails");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Admin access required");
  });

  it("returns empty lists when config doc does not exist", async () => {
    const mockGet = vi.fn().mockResolvedValue({ exists: false });
    vi.mocked(firestore.doc).mockReturnValue({ get: mockGet } as never);

    const res = await request(adminApp).get("/api/admin-settings/allowed-emails");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ emails: [], domains: [] });
  });

  it("returns emails and domains from Firestore config", async () => {
    const mockGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ emails: ["user@example.com"], domains: ["example.com"] }),
    });
    vi.mocked(firestore.doc).mockReturnValue({ get: mockGet } as never);

    const res = await request(adminApp).get("/api/admin-settings/allowed-emails");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ emails: ["user@example.com"], domains: ["example.com"] });
  });

  it("returns 500 when Firestore fails", async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error("Firestore unavailable"));
    vi.mocked(firestore.doc).mockReturnValue({ get: mockGet } as never);

    const res = await request(adminApp).get("/api/admin-settings/allowed-emails");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

// ============================================================
// PUT /api/admin-settings/allowed-emails
// ============================================================
describe("PUT /api/admin-settings/allowed-emails", () => {
  it("returns 403 for non-admin user", async () => {
    const res = await request(app)
      .put("/api/admin-settings/allowed-emails")
      .send({ emails: [], domains: [] });
    expect(res.status).toBe(403);
  });

  it("returns 400 when emails is not an array", async () => {
    const res = await request(adminApp)
      .put("/api/admin-settings/allowed-emails")
      .send({ emails: "not-array", domains: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when domains is not an array", async () => {
    const res = await request(adminApp)
      .put("/api/admin-settings/allowed-emails")
      .send({ emails: [], domains: "not-array" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when array contains non-string", async () => {
    const res = await request(adminApp)
      .put("/api/admin-settings/allowed-emails")
      .send({ emails: [123], domains: [] });
    expect(res.status).toBe(400);
  });

  it("normalizes and saves to Firestore", async () => {
    const mockSet = vi.fn().mockResolvedValue(undefined);
    vi.mocked(firestore.doc).mockReturnValue({ set: mockSet } as never);

    const res = await request(adminApp)
      .put("/api/admin-settings/allowed-emails")
      .send({ emails: ["User@Example.COM", "user@example.com"], domains: ["Example.COM", "another.org"] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      emails: ["user@example.com"],
      domains: ["example.com", "another.org"],
    });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ emails: ["user@example.com"], domains: ["example.com", "another.org"] }),
    );
  });

  it("returns 400 for invalid email format", async () => {
    const res = await request(adminApp)
      .put("/api/admin-settings/allowed-emails")
      .send({ emails: ["not-an-email"], domains: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid domain format", async () => {
    const res = await request(adminApp)
      .put("/api/admin-settings/allowed-emails")
      .send({ emails: [], domains: [""] });
    expect(res.status).toBe(400);
  });

  it("returns 500 when Firestore write fails", async () => {
    const mockSet = vi.fn().mockRejectedValue(new Error("Write failed"));
    vi.mocked(firestore.doc).mockReturnValue({ set: mockSet } as never);

    const res = await request(adminApp)
      .put("/api/admin-settings/allowed-emails")
      .send({ emails: ["test@test.com"], domains: [] });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

// ============================================================
// GET /api/admin-settings/staff
// ============================================================
describe("GET /api/admin-settings/staff", () => {
  it("returns 403 for non-admin", async () => {
    const res = await request(app).get("/api/admin-settings/staff");
    expect(res.status).toBe(403);
  });

  it("returns staff list with all fields for admin", async () => {
    const mockDocs = [
      { id: "s1", data: () => ({ name: "職員A", email: "a@test.com", role: "staff", disabled: false, createdAt: new Date() }) },
      { id: "s2", data: () => ({ name: "管理者B", email: "b@test.com", role: "admin", disabled: true, createdAt: new Date() }) },
    ];
    const mockGet = vi.fn().mockResolvedValue({ docs: mockDocs });
    vi.mocked(firestore.collection).mockReturnValue({ get: mockGet } as never);

    const res = await request(adminApp).get("/api/admin-settings/staff");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual(expect.objectContaining({ id: "s1", name: "職員A", email: "a@test.com", role: "staff", disabled: false }));
    expect(res.body[1]).toEqual(expect.objectContaining({ id: "s2", name: "管理者B", email: "b@test.com", role: "admin", disabled: true }));
  });

  it("returns 500 when Firestore fails", async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error("Firestore error"));
    vi.mocked(firestore.collection).mockReturnValue({ get: mockGet } as never);

    const res = await request(adminApp).get("/api/admin-settings/staff");
    expect(res.status).toBe(500);
  });
});

// ============================================================
// PATCH /api/admin-settings/staff/:id
// ============================================================
describe("PATCH /api/admin-settings/staff/:id", () => {
  const mockUpdate = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockUpdate.mockClear();
  });

  it("returns 403 for non-admin", async () => {
    const res = await request(app).patch("/api/admin-settings/staff/s1").send({ role: "admin" });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid role", async () => {
    const res = await request(adminApp).patch("/api/admin-settings/staff/s1").send({ role: "superadmin" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("role must be 'admin' or 'staff'");
  });

  it("returns 400 for invalid disabled", async () => {
    const res = await request(adminApp).patch("/api/admin-settings/staff/s1").send({ disabled: "yes" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("disabled must be a boolean");
  });

  it("returns 400 when no fields provided", async () => {
    const res = await request(adminApp).patch("/api/admin-settings/staff/s1").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("At least one of role or disabled is required");
  });

  it("returns 404 for nonexistent staff", async () => {
    vi.mocked(firestore.collection).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        update: mockUpdate,
      }),
    } as never);

    const res = await request(adminApp).patch("/api/admin-settings/staff/nonexistent").send({ role: "admin" });
    expect(res.status).toBe(404);
  });

  it("prevents admin from demoting themselves", async () => {
    const staffData = { name: "管理者", role: "admin" };
    vi.mocked(firestore.collection).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: true, id: "admin-staff", data: () => staffData }),
        update: mockUpdate,
      }),
    } as never);

    const res = await request(adminApp).patch("/api/admin-settings/staff/admin-staff").send({ role: "staff" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot demote yourself");
  });

  it("prevents admin from disabling themselves", async () => {
    const staffData = { name: "管理者", role: "admin" };
    vi.mocked(firestore.collection).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: true, id: "admin-staff", data: () => staffData }),
        update: mockUpdate,
      }),
    } as never);

    const res = await request(adminApp).patch("/api/admin-settings/staff/admin-staff").send({ disabled: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot disable yourself");
  });

  it("prevents demoting the last admin", async () => {
    const staffData = { name: "唯一の管理者", role: "admin", email: "other@test.com" };
    const adminQueryDocs = [{ id: "other-admin", data: () => ({ role: "admin", disabled: false }) }];

    const mockWhereChain = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ docs: adminQueryDocs }),
        }),
      }),
    };
    vi.mocked(firestore.collection).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: true, id: "other-admin", data: () => staffData }),
        update: mockUpdate,
      }),
      where: vi.fn().mockReturnValue(mockWhereChain),
    } as never);

    const res = await request(adminApp).patch("/api/admin-settings/staff/other-admin").send({ role: "staff" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot demote the last admin");
  });

  it("successfully updates role", async () => {
    const staffData = { name: "職員A", email: "a@test.com", role: "staff", disabled: false, createdAt: new Date() };
    const updatedData = { ...staffData, role: "admin" };
    const mockGet = vi.fn()
      .mockResolvedValueOnce({ exists: true, id: "s1", data: () => staffData })
      .mockResolvedValueOnce({ exists: true, id: "s1", data: () => updatedData });
    const mockRef = { get: mockGet, update: mockUpdate };
    vi.mocked(firestore.collection).mockReturnValue({
      doc: vi.fn().mockReturnValue(mockRef),
    } as never);

    const res = await request(adminApp).patch("/api/admin-settings/staff/s1").send({ role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }));
  });

  it("successfully toggles disabled", async () => {
    const staffData = { name: "職員A", email: "a@test.com", role: "staff", disabled: false, createdAt: new Date() };
    const updatedData = { ...staffData, disabled: true };
    const mockGet = vi.fn()
      .mockResolvedValueOnce({ exists: true, id: "s1", data: () => staffData })
      .mockResolvedValueOnce({ exists: true, id: "s1", data: () => updatedData });
    const mockRef = { get: mockGet, update: mockUpdate };
    vi.mocked(firestore.collection).mockReturnValue({
      doc: vi.fn().mockReturnValue(mockRef),
    } as never);

    const res = await request(adminApp).patch("/api/admin-settings/staff/s1").send({ disabled: true });
    expect(res.status).toBe(200);
    expect(res.body.disabled).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });
});

// ============================================================
// Support Plan API
// ============================================================

const MOCK_CONSULTATION_COMPLETED = {
  id: "cons-1",
  caseId: "case-1",
  staffId: "staff-1",
  content: "生活困窮の相談",
  transcript: "",
  summary: "生活保護の相談。収入が低く生活が困難。",
  suggestedSupports: [{ menuId: "m1", menuName: "生活保護", reason: "収入不足", relevanceScore: 0.9 }],
  consultationType: "visit" as const,
  aiStatus: "completed" as const,
  createdAt: NOW,
  updatedAt: NOW,
};

const MOCK_SUPPORT_PLAN = {
  id: "plan-1",
  caseId: "case-1",
  staffId: "staff-1",
  status: "draft" as const,
  clientName: "テスト太郎",
  clientId: "client-001",
  overallPolicy: "生活保護受給に向けた支援",
  goals: [{
    area: "経済的自立",
    longTermGoal: "安定した生活基盤の確立",
    shortTermGoal: "生活保護の申請手続き完了",
    supports: ["生活保護申請支援", "家計相談"],
    frequency: "週1回",
    responsible: "生活支援員",
  }],
  specialNotes: "持病あり",
  planStartDate: "2026-03-10",
  nextReviewDate: "2026-06-10",
  createdAt: NOW,
  updatedAt: NOW,
};

describe("Support Plan API", () => {
  describe("POST /api/cases/:id/support-plan/draft", () => {
    it("generates a support plan draft from consultations", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(consultationRepo.listConsultations).mockResolvedValue([MOCK_CONSULTATION_COMPLETED]);
      vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
      vi.mocked(generateSupportPlanDraft).mockResolvedValue({
        overallPolicy: "生活保護受給に向けた支援",
        goals: MOCK_SUPPORT_PLAN.goals,
        specialNotes: "持病あり",
      });
      vi.mocked(supportPlanRepo.createSupportPlan).mockResolvedValue(MOCK_SUPPORT_PLAN);

      const res = await request(app).post("/api/cases/case-1/support-plan/draft");
      expect(res.status).toBe(201);
      expect(res.body.overallPolicy).toBe("生活保護受給に向けた支援");
      expect(res.body.goals).toHaveLength(1);
      expect(generateSupportPlanDraft).toHaveBeenCalledWith(
        MOCK_CASE,
        [MOCK_CONSULTATION_COMPLETED],
        [],
      );
    });

    it("returns 400 when no completed consultations exist", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(consultationRepo.listConsultations).mockResolvedValue([
        { ...MOCK_CONSULTATION_COMPLETED, aiStatus: "pending" as const, summary: "" },
      ]);
      vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);

      const res = await request(app).post("/api/cases/case-1/support-plan/draft");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("AI分析が完了した相談記録がありません");
    });

    it("returns 403 for unauthorized access", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(OTHER_STAFF_CASE);

      const res = await request(app).post("/api/cases/case-other/support-plan/draft");
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/cases/:id/support-plan", () => {
    it("returns the latest support plan", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.getLatestSupportPlan).mockResolvedValue(MOCK_SUPPORT_PLAN);

      const res = await request(app).get("/api/cases/case-1/support-plan");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe("plan-1");
      expect(res.body.status).toBe("draft");
    });

    it("returns 404 when no support plan exists", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.getLatestSupportPlan).mockResolvedValue(null);

      const res = await request(app).get("/api/cases/case-1/support-plan");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/cases/:id/support-plan/:planId", () => {
    it("updates a draft support plan", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.updateSupportPlan).mockResolvedValue({
        ...MOCK_SUPPORT_PLAN,
        overallPolicy: "更新された支援方針",
      });

      const res = await request(app)
        .patch("/api/cases/case-1/support-plan/plan-1")
        .send({ overallPolicy: "更新された支援方針" });
      expect(res.status).toBe(200);
      expect(res.body.overallPolicy).toBe("更新された支援方針");
    });

    it("confirms a support plan", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.updateSupportPlan).mockResolvedValue({
        ...MOCK_SUPPORT_PLAN,
        status: "confirmed",
        confirmedAt: NOW,
      });

      const res = await request(app)
        .patch("/api/cases/case-1/support-plan/plan-1")
        .send({ status: "confirmed" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("confirmed");
    });

    it("returns 400 when editing a confirmed plan", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.updateSupportPlan).mockRejectedValue(
        new Error("Cannot edit a confirmed support plan"),
      );

      const res = await request(app)
        .patch("/api/cases/case-1/support-plan/plan-1")
        .send({ overallPolicy: "変更" });
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent plan", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.updateSupportPlan).mockRejectedValue(
        new Error("SupportPlan nonexistent not found"),
      );

      const res = await request(app)
        .patch("/api/cases/case-1/support-plan/nonexistent")
        .send({ overallPolicy: "変更" });
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid input", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

      const res = await request(app)
        .patch("/api/cases/case-1/support-plan/plan-1")
        .send({ status: "invalid_status" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/cases/:id/support-plan/list", () => {
    it("returns all support plans for a case", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.listSupportPlans).mockResolvedValue([MOCK_SUPPORT_PLAN]);

      const res = await request(app).get("/api/cases/case-1/support-plan/list");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });
});

// ── Monitoring Sheet API ──

const MOCK_CONFIRMED_PLAN = {
  ...MOCK_SUPPORT_PLAN,
  status: "confirmed" as const,
  confirmedAt: NOW,
};

const MOCK_MONITORING_SHEET = {
  id: "sheet-1",
  caseId: "case-1",
  supportPlanId: "plan-1",
  staffId: "staff-1",
  status: "draft" as const,
  monitoringDate: "2026-03-10",
  overallEvaluation: "全体的に改善傾向",
  goalEvaluations: [{
    area: "経済的自立",
    longTermGoal: "安定した生活基盤の確立",
    shortTermGoal: "生活保護の申請手続き完了",
    progress: "improved" as const,
    evaluation: "生活保護申請が受理された",
    nextAction: "受給開始後の家計管理支援",
  }],
  environmentChanges: "住居が安定した",
  clientFeedback: "前向きに取り組めている",
  specialNotes: "",
  nextMonitoringDate: "2026-04-10",
  createdAt: NOW,
  updatedAt: NOW,
};

describe("Monitoring Sheet API", () => {
  describe("POST /api/cases/:id/monitoring/draft", () => {
    it("generates a monitoring sheet draft", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.getLatestSupportPlan).mockResolvedValue(MOCK_CONFIRMED_PLAN);
      vi.mocked(consultationRepo.listConsultations).mockResolvedValue([MOCK_CONSULTATION_COMPLETED]);
      vi.mocked(generateMonitoringDraft).mockResolvedValue({
        overallEvaluation: MOCK_MONITORING_SHEET.overallEvaluation,
        goalEvaluations: MOCK_MONITORING_SHEET.goalEvaluations,
        environmentChanges: MOCK_MONITORING_SHEET.environmentChanges,
        clientFeedback: MOCK_MONITORING_SHEET.clientFeedback,
        specialNotes: MOCK_MONITORING_SHEET.specialNotes,
      });
      vi.mocked(monitoringRepo.createMonitoringSheet).mockResolvedValue(MOCK_MONITORING_SHEET);

      const res = await request(app).post("/api/cases/case-1/monitoring/draft");
      expect(res.status).toBe(201);
      expect(res.body.overallEvaluation).toBe("全体的に改善傾向");
    });

    it("returns 400 when no support plan exists", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.getLatestSupportPlan).mockResolvedValue(null);

      const res = await request(app).post("/api/cases/case-1/monitoring/draft");
      expect(res.status).toBe(400);
    });

    it("returns 400 when support plan is not confirmed", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.getLatestSupportPlan).mockResolvedValue(MOCK_SUPPORT_PLAN);

      const res = await request(app).post("/api/cases/case-1/monitoring/draft");
      expect(res.status).toBe(400);
    });

    it("returns 400 when no completed consultations", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(supportPlanRepo.getLatestSupportPlan).mockResolvedValue(MOCK_CONFIRMED_PLAN);
      vi.mocked(consultationRepo.listConsultations).mockResolvedValue([]);

      const res = await request(app).post("/api/cases/case-1/monitoring/draft");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/cases/:id/monitoring", () => {
    it("returns the latest monitoring sheet", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(monitoringRepo.getLatestMonitoringSheet).mockResolvedValue(MOCK_MONITORING_SHEET);

      const res = await request(app).get("/api/cases/case-1/monitoring");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe("sheet-1");
    });

    it("returns 404 when no monitoring sheet exists", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(monitoringRepo.getLatestMonitoringSheet).mockResolvedValue(null);

      const res = await request(app).get("/api/cases/case-1/monitoring");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/cases/:id/monitoring/:sheetId", () => {
    it("updates a draft monitoring sheet", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(monitoringRepo.updateMonitoringSheet).mockResolvedValue({
        ...MOCK_MONITORING_SHEET,
        overallEvaluation: "更新された評価",
      });

      const res = await request(app)
        .patch("/api/cases/case-1/monitoring/sheet-1")
        .send({ overallEvaluation: "更新された評価" });
      expect(res.status).toBe(200);
      expect(res.body.overallEvaluation).toBe("更新された評価");
    });

    it("returns 400 for confirmed sheet", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(monitoringRepo.updateMonitoringSheet).mockRejectedValue(
        new Error("Cannot edit a confirmed monitoring sheet"),
      );

      const res = await request(app)
        .patch("/api/cases/case-1/monitoring/sheet-1")
        .send({ overallEvaluation: "test" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid input", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);

      const res = await request(app)
        .patch("/api/cases/case-1/monitoring/sheet-1")
        .send({ status: "invalid_status" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/cases/:id/monitoring/list", () => {
    it("returns all monitoring sheets for a case", async () => {
      vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
      vi.mocked(monitoringRepo.listMonitoringSheets).mockResolvedValue([MOCK_MONITORING_SHEET]);

      const res = await request(app).get("/api/cases/case-1/monitoring/list");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });
});

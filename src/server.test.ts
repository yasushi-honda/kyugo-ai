import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// Mock dependencies before importing routes
vi.mock("./config.js", () => ({
  firestore: {
    collection: vi.fn(),
  },
  generativeModel: {
    generateContent: vi.fn(),
  },
  firebaseAuth: {
    verifyIdToken: vi.fn(),
  },
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
import { requireAuth } from "./middleware/auth.js";
import * as caseRepo from "./repositories/case-repository.js";
import * as consultationRepo from "./repositories/consultation-repository.js";
import * as supportMenuRepo from "./repositories/support-menu-repository.js";
import { analyzeConsultation, analyzeAudioConsultation } from "./services/ai.js";
import { Timestamp } from "@google-cloud/firestore";
import { firebaseAuth, firestore } from "./config.js";

// Fake user for route tests (routes now require req.user)
const FAKE_USER = { uid: "test-uid", email: "test@test.com", role: "staff" as const, staffId: "staff-1" };
const FAKE_ADMIN = { uid: "admin-uid", email: "admin@test.com", role: "admin" as const, staffId: "admin-staff" };

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.user = FAKE_USER; next(); });
app.use("/api/cases", casesRouter);
app.use("/api/support-menus", supportMenusRouter);

// App with admin user
const adminApp = express();
adminApp.use(express.json());
adminApp.use((req, _res, next) => { req.user = FAKE_ADMIN; next(); });
adminApp.use("/api/cases", casesRouter);

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
    const mockGet = vi.fn().mockResolvedValue({ empty: false, docs: [staffDoc] });
    const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(firestore.collection).mockReturnValue({ where: mockWhere } as never);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      uid: "uid-me",
      email: "me@example.com",
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
      name: "New User",
    } as never);

    const mockCreate = vi.fn().mockResolvedValue(undefined);
    const mockDoc = vi.fn().mockReturnValue({ id: "uid-new", create: mockCreate });
    const mockGet = vi.fn().mockResolvedValue({ empty: true, docs: [] });
    const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(firestore.collection).mockReturnValue({ where: mockWhere, doc: mockDoc } as never);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      uid: "uid-new",
      email: "new@example.com",
      role: "staff",
      staffId: "uid-new",
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: "uid-new",
      email: "new@example.com",
      role: "staff",
    }));
  });

  it("returns 401 when Firestore query fails", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "uid-err",
      email: "err@example.com",
    } as never);

    const mockGet = vi.fn().mockRejectedValue(new Error("Firestore unavailable"));
    const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(firestore.collection).mockReturnValue({ where: mockWhere } as never);

    const res = await request(authApp)
      .get("/api/me")
      .set("Authorization", "Bearer valid-token");

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
    expect(res.body.error).toContain("required");
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
});

describe("POST /api/cases/:id/consultations/audio", () => {
  const MOCK_AUDIO_RESULT = {
    transcript: "相談者: 家賃が払えなくて困っています。職員: 住居確保給付金という制度があります。",
    summary: "家賃支払い困難の相談。住居確保給付金を案内。",
    suggestedSupports: [
      { menuId: "juukyo-kakuho-kyuufukin", menuName: "住居確保給付金", reason: "家賃支払い困難", relevanceScore: 0.95 },
    ],
  };

  it("processes audio file and returns transcript + analysis", async () => {
    vi.mocked(caseRepo.getCase).mockResolvedValue(MOCK_CASE);
    vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue([]);
    vi.mocked(analyzeAudioConsultation).mockResolvedValue(MOCK_AUDIO_RESULT);
    vi.mocked(consultationRepo.createConsultation).mockResolvedValue({
      id: "cons-audio-1",
      caseId: "case-1",
      staffId: "staff-1",
      content: "",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "visit",
      createdAt: NOW,
      updatedAt: NOW,
    });
    vi.mocked(consultationRepo.updateConsultationAIResults).mockResolvedValue();

    const res = await request(app)
      .post("/api/cases/case-1/consultations/audio")
      .field("consultationType", "visit")
      .field("context", "訪問相談")
      .attach("audio", Buffer.from("fake-audio-data"), { filename: "recording.wav", contentType: "audio/wav" });

    expect(res.status).toBe(201);
    expect(res.body.transcript).toBe(MOCK_AUDIO_RESULT.transcript);
    expect(res.body.summary).toBe(MOCK_AUDIO_RESULT.summary);
    expect(res.body.suggestedSupports).toHaveLength(1);
    expect(vi.mocked(consultationRepo.createConsultation)).toHaveBeenCalledWith(
      "case-1",
      expect.objectContaining({ staffId: "staff-1" }),
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

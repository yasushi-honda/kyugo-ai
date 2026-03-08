import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "@google-cloud/firestore";

vi.mock("../config.js", () => ({
  firestore: { collection: vi.fn() },
  generativeModel: { generateContent: vi.fn() },
  firebaseAuth: { verifyIdToken: vi.fn(), getUser: vi.fn() },
  PROJECT_ID: "test-project",
  REGION: "asia-northeast1",
  MODEL: "gemini-2.5-flash",
}));

vi.mock("../repositories/consultation-repository.js", () => ({
  listRetryPendingConsultations: vi.fn(),
  expireRetryPendingConsultations: vi.fn(),
  updateConsultationAIResults: vi.fn(),
  updateConsultationAIStatus: vi.fn(),
}));

vi.mock("../repositories/support-menu-repository.js", () => ({
  listSupportMenus: vi.fn(),
}));

vi.mock("../services/ai.js", () => ({
  analyzeConsultation: vi.fn(),
}));

import { retryPendingConsultations } from "./ai-retry.js";
import * as consultationRepo from "../repositories/consultation-repository.js";
import * as supportMenuRepo from "../repositories/support-menu-repository.js";
import { analyzeConsultation } from "../services/ai.js";
import type { Consultation, SupportMenu } from "../types.js";

const MOCK_MENUS: SupportMenu[] = [
  { id: "menu-1", name: "生活保護", category: "income", eligibility: "", description: "", relatedLaws: [], updatedAt: Timestamp.now() },
];

function mockConsultation(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: "cons-1",
    caseId: "case-1",
    staffId: "staff-1",
    content: "テスト相談",
    transcript: "",
    summary: "",
    suggestedSupports: [],
    consultationType: "visit",
    aiStatus: "retry_pending",
    aiRetryCount: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supportMenuRepo.listSupportMenus).mockResolvedValue(MOCK_MENUS);
  vi.mocked(consultationRepo.expireRetryPendingConsultations).mockResolvedValue(0);
});

describe("retryPendingConsultations", () => {
  it("リトライ対象がない場合は何もしない", async () => {
    vi.mocked(consultationRepo.listRetryPendingConsultations).mockResolvedValue([]);

    const result = await retryPendingConsultations();

    expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0, expired: 0 });
    expect(analyzeConsultation).not.toHaveBeenCalled();
  });

  it("リトライ成功時にAI結果を更新する", async () => {
    const consultation = mockConsultation();
    vi.mocked(consultationRepo.listRetryPendingConsultations).mockResolvedValue([consultation]);
    vi.mocked(analyzeConsultation).mockResolvedValue({
      summary: "リトライ成功の要約",
      suggestedSupports: [],
    });

    const result = await retryPendingConsultations();

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, expired: 0 });
    expect(consultationRepo.updateConsultationAIResults).toHaveBeenCalledWith(
      "case-1", "cons-1", "リトライ成功の要約", [],
    );
  });

  it("一時障害で再失敗時にretry_pendingを維持しカウントをインクリメント", async () => {
    const consultation = mockConsultation({ aiRetryCount: 1 });
    vi.mocked(consultationRepo.listRetryPendingConsultations).mockResolvedValue([consultation]);
    const transientErr = new Error("Service unavailable") as Error & { status: number };
    transientErr.status = 503;
    vi.mocked(analyzeConsultation).mockRejectedValue(transientErr);

    const result = await retryPendingConsultations();

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1, expired: 0 });
    expect(consultationRepo.updateConsultationAIStatus).toHaveBeenCalledWith(
      "case-1", "cons-1", "retry_pending", "Service unavailable", 2,
      expect.objectContaining({ _seconds: expect.any(Number) }),
    );
  });

  it("永続エラーで再失敗時にerrorに遷移する", async () => {
    const consultation = mockConsultation({ aiRetryCount: 0 });
    vi.mocked(consultationRepo.listRetryPendingConsultations).mockResolvedValue([consultation]);
    vi.mocked(analyzeConsultation).mockRejectedValue(new Error("Invalid request"));

    const result = await retryPendingConsultations();

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1, expired: 0 });
    expect(consultationRepo.updateConsultationAIStatus).toHaveBeenCalledWith(
      "case-1", "cons-1", "error", "Invalid request", 1, undefined,
    );
  });

  it("max retry(3回目)の一時障害ではerrorに遷移する", async () => {
    const consultation = mockConsultation({ aiRetryCount: 2 });
    vi.mocked(consultationRepo.listRetryPendingConsultations).mockResolvedValue([consultation]);
    const transientErr = new Error("Rate limit") as Error & { status: number };
    transientErr.status = 429;
    vi.mocked(analyzeConsultation).mockRejectedValue(transientErr);

    const result = await retryPendingConsultations();

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1, expired: 0 });
    expect(consultationRepo.updateConsultationAIStatus).toHaveBeenCalledWith(
      "case-1", "cons-1", "error", "Rate limit", 3, undefined,
    );
  });

  it("max retry超過分をexpireする", async () => {
    vi.mocked(consultationRepo.expireRetryPendingConsultations).mockResolvedValue(2);
    vi.mocked(consultationRepo.listRetryPendingConsultations).mockResolvedValue([]);

    const result = await retryPendingConsultations();

    expect(result.expired).toBe(2);
    expect(consultationRepo.expireRetryPendingConsultations).toHaveBeenCalled();
  });

  it("複数のconsultationを順次処理する", async () => {
    const cons1 = mockConsultation({ id: "cons-1", caseId: "case-1" });
    const cons2 = mockConsultation({ id: "cons-2", caseId: "case-2" });
    vi.mocked(consultationRepo.listRetryPendingConsultations).mockResolvedValue([cons1, cons2]);
    vi.mocked(analyzeConsultation)
      .mockResolvedValueOnce({ summary: "要約1", suggestedSupports: [] })
      .mockRejectedValueOnce(new Error("Failed"));

    const result = await retryPendingConsultations();

    expect(result).toEqual({ processed: 2, succeeded: 1, failed: 1, expired: 0 });
  });

  it("指数バックオフでnextRetryAtが増加する", async () => {
    const consultation = mockConsultation({ aiRetryCount: 1 });
    vi.mocked(consultationRepo.listRetryPendingConsultations).mockResolvedValue([consultation]);
    const transientErr = new Error("Timeout") as Error & { code: number };
    transientErr.code = 503;
    vi.mocked(analyzeConsultation).mockRejectedValue(transientErr);

    const before = Date.now();
    await retryPendingConsultations();
    const after = Date.now();

    const call = vi.mocked(consultationRepo.updateConsultationAIStatus).mock.calls[0];
    const nextRetryAt = call[5] as Timestamp;
    // retryCount=2 → baseDelay * 2^2 = 5min * 4 = 20min
    const expectedDelayMs = 5 * 60 * 1000 * 4;
    const actualDelay = nextRetryAt.toMillis() - before;
    expect(actualDelay).toBeGreaterThanOrEqual(expectedDelayMs - 1000);
    expect(actualDelay).toBeLessThanOrEqual(expectedDelayMs + (after - before) + 1000);
  });
});

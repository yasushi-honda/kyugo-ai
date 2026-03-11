import { describe, it, expect, vi, beforeEach } from "vitest";

// Firestoreモック
const mockUpdate = vi.fn();
const mockDoc = vi.fn(() => ({
  update: mockUpdate,
  get: vi.fn(),
}));
const mockGet = vi.fn();
const mockWhere = vi.fn().mockReturnThis();
vi.mock("../config.js", () => ({
  firestore: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          doc: mockDoc,
          where: mockWhere,
          get: mockGet,
        })),
      })),
      get: vi.fn().mockResolvedValue({
        docs: [{ id: "case-1" }],
      }),
    })),
  },
  generativeModel: { generateContent: vi.fn() },
  firebaseAuth: { verifyIdToken: vi.fn(), getUser: vi.fn() },
  PROJECT_ID: "test-project",
  REGION: "asia-northeast1",
  MODEL: "gemini-2.5-flash",
}));

import { recoverStuckPendingConsultations, updateConsultationAIResults } from "./consultation-repository.js";

beforeEach(() => {
  vi.clearAllMocks();
  mockWhere.mockReturnThis();
});

describe("recoverStuckPendingConsultations", () => {
  it("contentありのpendingレコードはretry_pendingに遷移する", async () => {
    const mockDocRef = { update: vi.fn().mockResolvedValue(undefined) };
    mockGet.mockResolvedValue({
      docs: [{
        data: () => ({ content: "相談内容あり", aiStatus: "pending" }),
        ref: mockDocRef,
      }],
    });

    const count = await recoverStuckPendingConsultations();

    expect(count).toBe(1);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        aiStatus: "retry_pending",
        aiErrorMessage: "Recovered from stuck pending state",
        aiRetryCount: 0,
      }),
    );
  });

  it("content空のpendingレコードはerrorに遷移する（音声データ喪失）", async () => {
    const mockDocRef = { update: vi.fn().mockResolvedValue(undefined) };
    mockGet.mockResolvedValue({
      docs: [{
        data: () => ({ content: "", aiStatus: "pending" }),
        ref: mockDocRef,
      }],
    });

    const count = await recoverStuckPendingConsultations();

    expect(count).toBe(1);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        aiStatus: "error",
        aiErrorMessage: "Recovered from stuck pending state (no content or audio available for retry)",
        aiRetryCount: 0,
      }),
    );
  });

  it("content未定義のpendingレコードはerrorに遷移する", async () => {
    const mockDocRef = { update: vi.fn().mockResolvedValue(undefined) };
    mockGet.mockResolvedValue({
      docs: [{
        data: () => ({ aiStatus: "pending" }),
        ref: mockDocRef,
      }],
    });

    const count = await recoverStuckPendingConsultations();

    expect(count).toBe(1);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        aiStatus: "error",
      }),
    );
  });

  it("stuckなpendingレコードがない場合は0を返す", async () => {
    mockGet.mockResolvedValue({ docs: [] });

    const count = await recoverStuckPendingConsultations();

    expect(count).toBe(0);
  });
});

describe("updateConsultationAIResults", () => {
  it("transcript指定時はupdateペイロードにtranscriptを含む", async () => {
    mockUpdate.mockResolvedValue(undefined);

    await updateConsultationAIResults("case-1", "cons-1", "要約", [], "文字起こし");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript: "文字起こし",
        summary: "要約",
        aiStatus: "completed",
      }),
    );
  });

  it("transcript未指定時はupdateペイロードにtranscriptを含まない", async () => {
    mockUpdate.mockResolvedValue(undefined);

    await updateConsultationAIResults("case-1", "cons-1", "要約", []);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.summary).toBe("要約");
    expect(updatePayload.aiStatus).toBe("completed");
    expect("transcript" in updatePayload).toBe(false);
  });
});

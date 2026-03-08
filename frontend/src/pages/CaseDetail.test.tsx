import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CaseDetail } from "./CaseDetail";
import { TestAuthWrapper } from "../test-utils";

import { api } from "../api";

const mockCase = {
  id: "case-1",
  clientName: "山田太郎",
  clientId: "client-001",
  status: "active" as const,
  assignedStaffId: "staff-001",
  dateOfBirth: { _seconds: 631152000 },
  householdInfo: {},
  incomeInfo: {},
  createdAt: { _seconds: 1700000000 },
  updatedAt: { _seconds: 1700000000 },
};

const mockConsultations = [
  {
    id: "cons-1",
    caseId: "case-1",
    staffId: "staff-001",
    content: "初回相談の記録",
    transcript: "",
    summary: "AI要約テスト",
    suggestedSupports: [
      { menuId: "m1", menuName: "生活保護", reason: "理由テスト", relevanceScore: 0.85 },
    ],
    consultationType: "counter" as const,
    aiStatus: "completed" as const,
    createdAt: { _seconds: 1700000000 },
    updatedAt: { _seconds: 1700000000 },
  },
];

beforeEach(() => {
  vi.mocked(api.getCase).mockReset();
  vi.mocked(api.listConsultations).mockReset();
  vi.mocked(api.updateCaseStatus).mockReset();
});

function renderCaseDetail(caseId = "case-1") {
  return render(
    <TestAuthWrapper>
      <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
        <Routes>
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </TestAuthWrapper>,
  );
}

describe("CaseDetail", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.getCase).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listConsultations).mockReturnValue(new Promise(() => {}));
    renderCaseDetail();

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("shows error state when case not found", async () => {
    vi.mocked(api.getCase).mockRejectedValue(new Error("Not found"));
    vi.mocked(api.listConsultations).mockRejectedValue(new Error("Not found"));
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("ケースが見つかりません")).toBeInTheDocument();
    });
  });

  it("displays case information", async () => {
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument();
    });
    expect(screen.getByText("ID: client-001")).toBeInTheDocument();
    expect(screen.getByText("対応中")).toBeInTheDocument();
  });

  it("displays consultation timeline", async () => {
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue(mockConsultations);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("初回相談の記録")).toBeInTheDocument();
    });
    expect(screen.getByText("窓口")).toBeInTheDocument();
  });

  it("displays AI analysis results in consultation", async () => {
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue(mockConsultations);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("AI要約テスト")).toBeInTheDocument();
    });
    expect(screen.getByText("生活保護")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument(); // relevanceScore * 100
  });

  it("shows empty state when no consultations", async () => {
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("相談記録がありません")).toBeInTheDocument();
    });
  });

  it("shows status change buttons for active case", async () => {
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("照会中に変更")).toBeInTheDocument();
    });
    expect(screen.getByText("ケースを終了")).toBeInTheDocument();
  });

  it("calls updateCaseStatus when status button clicked", async () => {
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([]);
    vi.mocked(api.updateCaseStatus).mockResolvedValue({ ...mockCase, status: "referred" });

    renderCaseDetail();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("照会中に変更")).toBeInTheDocument();
    });

    await user.click(screen.getByText("照会中に変更"));

    expect(api.updateCaseStatus).toHaveBeenCalledWith("case-1", "referred");
  });

  it("shows closed message for closed case", async () => {
    vi.mocked(api.getCase).mockResolvedValue({ ...mockCase, status: "closed" });
    vi.mocked(api.listConsultations).mockResolvedValue([]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("このケースは終了しています")).toBeInTheDocument();
    });
  });

  it("shows AI analyzing indicator when aiStatus is pending", async () => {
    const pendingConsultation = {
      ...mockConsultations[0],
      id: "cons-pending",
      summary: "",
      suggestedSupports: [],
      aiStatus: "pending" as const,
    };
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([pendingConsultation]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("AI分析中...")).toBeInTheDocument();
    });
    // AI分析結果パネルは表示されない
    expect(screen.queryByText("AI分析結果")).not.toBeInTheDocument();
  });

  it("shows AI analyzing indicator when aiStatus is retrying", async () => {
    const retryingConsultation = {
      ...mockConsultations[0],
      id: "cons-retrying",
      summary: "",
      suggestedSupports: [],
      aiStatus: "retrying" as const,
    };
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([retryingConsultation]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("AI分析中...")).toBeInTheDocument();
    });
    expect(screen.queryByText("AI分析結果")).not.toBeInTheDocument();
  });

  it("shows retry pending indicator when aiStatus is retry_pending", async () => {
    const retryConsultation = {
      ...mockConsultations[0],
      id: "cons-retry",
      summary: "",
      suggestedSupports: [],
      aiStatus: "retry_pending" as const,
    };
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([retryConsultation]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("AI分析 再試行待ち")).toBeInTheDocument();
    });
  });

  it("shows error message when aiStatus is error", async () => {
    const errorConsultation = {
      ...mockConsultations[0],
      id: "cons-error",
      summary: "",
      suggestedSupports: [],
      aiStatus: "error" as const,
      aiErrorMessage: "Model overloaded",
    };
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([errorConsultation]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("AI分析エラー")).toBeInTheDocument();
    });
    expect(screen.getByText("Model overloaded")).toBeInTheDocument();
  });

  it("shows error without message when aiErrorMessage is undefined", async () => {
    const errorNoMsg = {
      ...mockConsultations[0],
      id: "cons-error-nomsg",
      summary: "",
      suggestedSupports: [],
      aiStatus: "error" as const,
    };
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([errorNoMsg]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("AI分析エラー")).toBeInTheDocument();
    });
    // aiErrorMessageがないのでエラー詳細テキストは表示されない
    const panel = screen.getByText("AI分析エラー").closest(".ai-panel-error");
    expect(panel?.querySelector(".ai-error-message")).toBeNull();
  });

  it("shows completed AI results with aiStatus completed", async () => {
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue(mockConsultations);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("AI要約テスト")).toBeInTheDocument();
    });
    // pending/error表示は出ない
    expect(screen.queryByText("AI分析中...")).not.toBeInTheDocument();
    expect(screen.queryByText("AI分析エラー")).not.toBeInTheDocument();
  });

  it("shows AI results for legacy data without aiStatus field", async () => {
    const legacyConsultation = {
      ...mockConsultations[0],
      id: "cons-legacy",
      aiStatus: undefined as unknown as "completed",
    };
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([legacyConsultation]);
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText("AI要約テスト")).toBeInTheDocument();
    });
  });

  it("opens new consultation modal", async () => {
    vi.mocked(api.getCase).mockResolvedValue(mockCase);
    vi.mocked(api.listConsultations).mockResolvedValue([]);
    renderCaseDetail();

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText(/新規相談記録/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/新規相談記録/));

    expect(screen.getByText("新規相談記録", { selector: "h3" })).toBeInTheDocument();
  });
});

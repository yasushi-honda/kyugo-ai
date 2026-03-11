import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LegalSearchView } from "./LegalSearchView";
import { api } from "../api";
import type { LegalSearchResult } from "../api";

const MOCK_RESULT: LegalSearchResult = {
  id: "legal-1",
  caseId: "case-1",
  staffId: "staff-1",
  query: "生活保護の申請要件",
  references: [
    {
      lawName: "生活保護法",
      article: "第4条",
      summary: "保護の補足性",
      sourceUrl: "https://example.com",
      relevance: "申請要件に直結",
    },
  ],
  legalBasis: "生活保護法に基づく",
  createdAt: { _seconds: 1710000000 },
};

beforeEach(() => {
  vi.mocked(api.listLegalSearches).mockReset();
  vi.mocked(api.searchLegalInfo).mockReset();
});

describe("LegalSearchView", () => {
  it("renders search form and empty state when no history", async () => {
    vi.mocked(api.listLegalSearches).mockResolvedValue([]);

    render(<LegalSearchView caseId="case-1" />);

    await waitFor(() => {
      expect(screen.getByText("法令検索の履歴はありません。")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/検索したい内容を入力/)).toBeInTheDocument();
    expect(screen.getByText("関連法令を検索")).toBeInTheDocument();
  });

  it("displays search history on load", async () => {
    vi.mocked(api.listLegalSearches).mockResolvedValue([MOCK_RESULT]);

    render(<LegalSearchView caseId="case-1" />);

    await waitFor(() => {
      expect(screen.getByText("生活保護の申請要件")).toBeInTheDocument();
    });
    expect(screen.getByText("生活保護法")).toBeInTheDocument();
    expect(screen.getByText("生活保護法に基づく")).toBeInTheDocument();
  });

  it("disables button when query is empty", async () => {
    vi.mocked(api.listLegalSearches).mockResolvedValue([]);

    render(<LegalSearchView caseId="case-1" />);

    await waitFor(() => {
      expect(screen.getByText("関連法令を検索")).toBeDisabled();
    });
  });

  it("executes search and prepends result", async () => {
    vi.mocked(api.listLegalSearches).mockResolvedValue([]);
    vi.mocked(api.searchLegalInfo).mockResolvedValue(MOCK_RESULT);

    render(<LegalSearchView caseId="case-1" />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("関連法令を検索")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/検索したい内容を入力/), "生活保護");
    await user.click(screen.getByText("関連法令を検索"));

    await waitFor(() => {
      expect(screen.getByText("生活保護法に基づく")).toBeInTheDocument();
    });
    expect(api.searchLegalInfo).toHaveBeenCalledWith("case-1", "生活保護");
  });

  it("displays error message when search fails", async () => {
    vi.mocked(api.listLegalSearches).mockResolvedValue([]);
    vi.mocked(api.searchLegalInfo).mockRejectedValue(new Error("検索失敗"));

    render(<LegalSearchView caseId="case-1" />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("関連法令を検索")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/検索したい内容を入力/), "テスト");
    await user.click(screen.getByText("関連法令を検索"));

    await waitFor(() => {
      expect(screen.getByText("検索失敗")).toBeInTheDocument();
    });
  });

  it("displays error when history load fails", async () => {
    vi.mocked(api.listLegalSearches).mockRejectedValue(new Error("Network error"));

    render(<LegalSearchView caseId="case-1" />);

    await waitFor(() => {
      expect(screen.getByText("検索履歴の読み込みに失敗しました")).toBeInTheDocument();
    });
  });

  it("does not render source link for non-https URLs", async () => {
    const unsafeResult: LegalSearchResult = {
      ...MOCK_RESULT,
      references: [
        {
          lawName: "テスト法",
          article: "第1条",
          summary: "テスト",
          sourceUrl: "javascript:alert(1)",
          relevance: "テスト",
        },
      ],
    };
    vi.mocked(api.listLegalSearches).mockResolvedValue([unsafeResult]);

    render(<LegalSearchView caseId="case-1" />);

    await waitFor(() => {
      expect(screen.getByText("テスト法")).toBeInTheDocument();
    });
    expect(screen.queryByText("出典")).not.toBeInTheDocument();
  });

  it("renders source link when sourceUrl is provided", async () => {
    vi.mocked(api.listLegalSearches).mockResolvedValue([MOCK_RESULT]);

    render(<LegalSearchView caseId="case-1" />);

    await waitFor(() => {
      const link = screen.getByText("出典");
      expect(link).toHaveAttribute("href", "https://example.com");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });
});

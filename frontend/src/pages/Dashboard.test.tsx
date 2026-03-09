import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { TestAuthWrapper } from "../test-utils";

const mockCases = [
  {
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
  },
  {
    id: "case-2",
    clientName: "佐藤花子",
    clientId: "client-002",
    status: "referred" as const,
    assignedStaffId: "staff-001",
    dateOfBirth: { _seconds: 631152000 },
    householdInfo: {},
    incomeInfo: {},
    createdAt: { _seconds: 1700000000 },
    updatedAt: { _seconds: 1700000000 },
  },
  {
    id: "case-3",
    clientName: "鈴木一郎",
    clientId: "client-003",
    status: "closed" as const,
    assignedStaffId: "staff-001",
    dateOfBirth: { _seconds: 631152000 },
    householdInfo: {},
    incomeInfo: {},
    createdAt: { _seconds: 1700000000 },
    updatedAt: { _seconds: 1700000000 },
  },
];

import { api } from "../api";

const mockStaff = [
  { id: "staff-001", name: "山田職員" },
  { id: "test-staff-001", name: "テスト職員" },
];

beforeEach(() => {
  vi.mocked(api.listCases).mockReset();
  vi.mocked(api.listStaff).mockReset().mockResolvedValue(mockStaff);
  vi.mocked(api.getMe).mockReset().mockResolvedValue({
    uid: "test-uid",
    email: "test@example.com",
    name: "テスト職員",
    role: "staff",
    staffId: "test-staff-001",
  });
});

function renderDashboard() {
  return render(
    <TestAuthWrapper>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </TestAuthWrapper>,
  );
}

describe("Dashboard", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.listCases).mockReturnValue(new Promise(() => {}));
    renderDashboard();

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("shows empty state when no cases", async () => {
    vi.mocked(api.listCases).mockResolvedValue([]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("ケースがありません")).toBeInTheDocument();
    });
  });

  it("displays case cards after loading", async () => {
    vi.mocked(api.listCases).mockResolvedValue(mockCases);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument();
    });
    expect(screen.getByText("佐藤花子")).toBeInTheDocument();
    expect(screen.getByText("鈴木一郎")).toBeInTheDocument();
  });

  it("calculates stats correctly", async () => {
    vi.mocked(api.listCases).mockResolvedValue(mockCases);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument(); // total
    });

    // active=1, referred=1, closed=1
    const statValues = screen.queryAllByText("1");
    expect(statValues.length).toBeGreaterThanOrEqual(3);
  });

  it("shows new case modal when button is clicked", async () => {
    vi.mocked(api.listCases).mockResolvedValue([]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("ケースがありません")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("最初のケースを作成"));

    expect(screen.getByText("新規ケース作成")).toBeInTheDocument();
  });

  it("shows auth error when getMe fails", async () => {
    vi.mocked(api.getMe).mockRejectedValue(new Error("Network error"));
    vi.mocked(api.listCases).mockResolvedValue([]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/職員情報の取得に失敗しました/)).toBeInTheDocument();
    });
  });

  it("displays staff name instead of staffId", async () => {
    vi.mocked(api.listCases).mockResolvedValue(mockCases);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument();
    });
    // staffId("staff-001") → "山田職員" に解決される（👤絵文字と同じテキストノード内）
    expect(screen.getAllByText(/山田職員/).length).toBeGreaterThanOrEqual(1);
  });

  it("displays status labels in Japanese", async () => {
    vi.mocked(api.listCases).mockResolvedValue(mockCases);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText("対応中").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("照会中").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("終了").length).toBeGreaterThanOrEqual(1);
  });
});

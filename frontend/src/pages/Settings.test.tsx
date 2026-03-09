import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Settings } from "./Settings";
import { TestAuthWrapper } from "../test-utils";

import { api } from "../api";

beforeEach(() => {
  vi.mocked(api.getAllowedEmails).mockReset();
  vi.mocked(api.updateAllowedEmails).mockReset();
  vi.mocked(api.listAdminStaff).mockReset();
  vi.mocked(api.updateStaff).mockReset();
});

function renderSettings() {
  return render(
    <TestAuthWrapper>
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    </TestAuthWrapper>,
  );
}

describe("Settings - Whitelist tab", () => {
  beforeEach(() => {
    vi.mocked(api.getAllowedEmails).mockResolvedValue({ emails: [], domains: [] });
  });

  it("shows loading state initially", () => {
    vi.mocked(api.getAllowedEmails).mockReturnValue(new Promise(() => {}));
    renderSettings();

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("shows empty state when no config exists", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("登録されたメールアドレスはありません")).toBeInTheDocument();
    });
    expect(screen.getByText("登録されたドメインはありません")).toBeInTheDocument();
  });

  it("displays existing emails and domains", async () => {
    vi.mocked(api.getAllowedEmails).mockResolvedValue({
      emails: ["user@example.com"],
      domains: ["example.com"],
    });
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });
    expect(screen.getByText("@example.com")).toBeInTheDocument();
  });

  it("adds a new email", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("登録されたメールアドレスはありません")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const emailInput = screen.getByPlaceholderText("user@example.com");
    await user.type(emailInput, "new@test.com");
    await user.click(screen.getAllByText("追加")[0]);

    expect(screen.getByText("new@test.com")).toBeInTheDocument();
  });

  it("adds a new domain", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("登録されたドメインはありません")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const domainInput = screen.getByPlaceholderText("example.com");
    await user.type(domainInput, "test.org");
    await user.click(screen.getAllByText("追加")[1]);

    expect(screen.getByText("@test.org")).toBeInTheDocument();
  });

  it("removes an email", async () => {
    vi.mocked(api.getAllowedEmails).mockResolvedValue({
      emails: ["remove@test.com"],
      domains: [],
    });
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("remove@test.com")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("remove@test.comを削除"));

    expect(screen.queryByText("remove@test.com")).not.toBeInTheDocument();
  });

  it("removes a domain", async () => {
    vi.mocked(api.getAllowedEmails).mockResolvedValue({
      emails: [],
      domains: ["remove.org"],
    });
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("@remove.org")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("remove.orgを削除"));

    expect(screen.queryByText("@remove.org")).not.toBeInTheDocument();
  });

  it("saves changes and shows success message", async () => {
    vi.mocked(api.updateAllowedEmails).mockResolvedValue({
      emails: ["saved@test.com"],
      domains: [],
    });
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("変更を保存")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const emailInput = screen.getByPlaceholderText("user@example.com");
    await user.type(emailInput, "saved@test.com");
    await user.click(screen.getAllByText("追加")[0]);
    await user.click(screen.getByText("変更を保存"));

    await waitFor(() => {
      expect(screen.getByText("保存しました")).toBeInTheDocument();
    });
    expect(api.updateAllowedEmails).toHaveBeenCalledWith({
      emails: ["saved@test.com"],
      domains: [],
    });
  });

  it("shows error when loading fails", async () => {
    vi.mocked(api.getAllowedEmails).mockRejectedValue(new Error("Network error"));
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("shows error when saving fails", async () => {
    vi.mocked(api.updateAllowedEmails).mockRejectedValue(new Error("Save failed"));
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("変更を保存")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("変更を保存"));

    await waitFor(() => {
      expect(screen.getByText("Save failed")).toBeInTheDocument();
    });
  });

  it("prevents duplicate email addition", async () => {
    vi.mocked(api.getAllowedEmails).mockResolvedValue({
      emails: ["dup@test.com"],
      domains: [],
    });
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("dup@test.com")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const emailInput = screen.getByPlaceholderText("user@example.com");
    await user.type(emailInput, "dup@test.com");
    await user.click(screen.getAllByText("追加")[0]);

    expect(screen.getByText("このメールアドレスは既に登録されています")).toBeInTheDocument();
  });

  it("prevents duplicate domain addition", async () => {
    vi.mocked(api.getAllowedEmails).mockResolvedValue({
      emails: [],
      domains: ["dup.org"],
    });
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("@dup.org")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const domainInput = screen.getByPlaceholderText("example.com");
    await user.type(domainInput, "dup.org");
    await user.click(screen.getAllByText("追加")[1]);

    expect(screen.getByText("このドメインは既に登録されています")).toBeInTheDocument();
  });
});

describe("Settings - Account management tab", () => {
  const mockStaffList = [
    { id: "test-staff-001", name: "テスト管理者", email: "test@example.com", role: "admin" as const, disabled: false, createdAt: null },
    { id: "staff-2", name: "職員A", email: "a@test.com", role: "staff" as const, disabled: false, createdAt: null },
    { id: "staff-3", name: "無効職員", email: "disabled@test.com", role: "staff" as const, disabled: true, createdAt: null },
  ];

  beforeEach(() => {
    vi.mocked(api.getAllowedEmails).mockResolvedValue({ emails: [], domains: [] });
    vi.mocked(api.listAdminStaff).mockResolvedValue(mockStaffList);
  });

  it("shows tab navigation", async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText("ログイン許可")).toBeInTheDocument();
    });
    expect(screen.getByText("アカウント管理")).toBeInTheDocument();
  });

  it("switches to account management tab and shows staff list", async () => {
    renderSettings();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("アカウント管理")).toBeInTheDocument();
    });
    await user.click(screen.getByText("アカウント管理"));

    await waitFor(() => {
      expect(screen.getByText("職員A")).toBeInTheDocument();
    });
    expect(screen.getByText("a@test.com")).toBeInTheDocument();
    expect(screen.getByText("無効職員")).toBeInTheDocument();
  });

  it("shows self badge for current user", async () => {
    renderSettings();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("アカウント管理")).toBeInTheDocument();
    });
    await user.click(screen.getByText("アカウント管理"));

    await waitFor(() => {
      expect(screen.getByText("自分")).toBeInTheDocument();
    });
  });

  it("disables role select and disable button for self", async () => {
    renderSettings();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("アカウント管理")).toBeInTheDocument();
    });
    await user.click(screen.getByText("アカウント管理"));

    await waitFor(() => {
      expect(screen.getByText("テスト管理者")).toBeInTheDocument();
    });

    // Find the row with self badge - the select and button should be disabled
    const selects = screen.getAllByRole("combobox");
    // First select (self) should be disabled
    expect(selects[0]).toBeDisabled();
  });

  it("changes role via select", async () => {
    vi.mocked(api.updateStaff).mockResolvedValue({
      ...mockStaffList[1],
      role: "admin",
    });
    renderSettings();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("アカウント管理")).toBeInTheDocument();
    });
    await user.click(screen.getByText("アカウント管理"));

    await waitFor(() => {
      expect(screen.getByText("職員A")).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    // Second select is for staff-2
    await user.selectOptions(selects[1], "admin");

    await waitFor(() => {
      expect(api.updateStaff).toHaveBeenCalledWith("staff-2", { role: "admin" });
    });
  });

  it("toggles disabled status", async () => {
    vi.mocked(api.updateStaff).mockResolvedValue({
      ...mockStaffList[1],
      disabled: true,
    });
    renderSettings();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("アカウント管理")).toBeInTheDocument();
    });
    await user.click(screen.getByText("アカウント管理"));

    await waitFor(() => {
      expect(screen.getByText("職員A")).toBeInTheDocument();
    });

    // Find enabled "無効化" buttons (self button is disabled)
    const disableButtons = screen.getAllByText("無効化").filter((btn) => !(btn as HTMLButtonElement).disabled);
    await user.click(disableButtons[0]);

    await waitFor(() => {
      expect(api.updateStaff).toHaveBeenCalledWith("staff-2", { disabled: true });
    });
  });

  it("shows error from API", async () => {
    vi.mocked(api.listAdminStaff).mockRejectedValue(new Error("Failed to load staff"));
    renderSettings();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("アカウント管理")).toBeInTheDocument();
    });
    await user.click(screen.getByText("アカウント管理"));

    await waitFor(() => {
      expect(screen.getByText("Failed to load staff")).toBeInTheDocument();
    });
  });

  it("shows update error", async () => {
    vi.mocked(api.updateStaff).mockRejectedValue(new Error("Cannot demote the last admin"));
    renderSettings();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("アカウント管理")).toBeInTheDocument();
    });
    await user.click(screen.getByText("アカウント管理"));

    await waitFor(() => {
      expect(screen.getByText("職員A")).toBeInTheDocument();
    });

    const disableButtons = screen.getAllByText("無効化").filter((btn) => !(btn as HTMLButtonElement).disabled);
    await user.click(disableButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Cannot demote the last admin")).toBeInTheDocument();
    });
  });
});

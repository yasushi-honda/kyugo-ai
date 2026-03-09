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

describe("Settings", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.getAllowedEmails).mockReturnValue(new Promise(() => {}));
    renderSettings();

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("shows empty state when no config exists", async () => {
    vi.mocked(api.getAllowedEmails).mockResolvedValue({ emails: [], domains: [] });
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
    vi.mocked(api.getAllowedEmails).mockResolvedValue({ emails: [], domains: [] });
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
    vi.mocked(api.getAllowedEmails).mockResolvedValue({ emails: [], domains: [] });
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
    vi.mocked(api.getAllowedEmails).mockResolvedValue({ emails: [], domains: [] });
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
    vi.mocked(api.getAllowedEmails).mockResolvedValue({ emails: [], domains: [] });
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

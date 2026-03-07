import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCaseModal } from "./NewCaseModal";

vi.mock("../api", () => ({
  api: {
    createCase: vi.fn(),
  },
}));

import { api } from "../api";

beforeEach(() => {
  vi.mocked(api.createCase).mockReset();
});

function renderModal(props?: Partial<{ onClose: () => void; onCreated: () => void }>) {
  const onClose = props?.onClose ?? vi.fn();
  const onCreated = props?.onCreated ?? vi.fn();
  return {
    onClose,
    onCreated,
    ...render(<NewCaseModal onClose={onClose} onCreated={onCreated} />),
  };
}

describe("NewCaseModal", () => {
  it("renders form fields", () => {
    renderModal();

    expect(screen.getByText("新規ケース作成")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例: 山田 太郎")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例: client-001")).toBeInTheDocument();
  });

  it("disables submit button when required fields are empty", () => {
    renderModal();

    const submitBtn = screen.getByText("ケースを作成");
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit button when all required fields are filled", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("例: 山田 太郎"), "テスト太郎");
    await user.type(screen.getByPlaceholderText("例: client-001"), "client-test");
    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "1990-01-01");

    const submitBtn = screen.getByText("ケースを作成");
    expect(submitBtn).not.toBeDisabled();
  });

  it("calls onCreated after successful submission", async () => {
    vi.mocked(api.createCase).mockResolvedValue({
      id: "case-new",
      clientName: "テスト太郎",
      clientId: "client-test",
      status: "active",
      assignedStaffId: "staff-001",
      dateOfBirth: { _seconds: 631152000 },
      householdInfo: {},
      incomeInfo: {},
      createdAt: { _seconds: 1700000000 },
      updatedAt: { _seconds: 1700000000 },
    });

    const { onCreated } = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("例: 山田 太郎"), "テスト太郎");
    await user.type(screen.getByPlaceholderText("例: client-001"), "client-test");
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "1990-01-01");

    await user.click(screen.getByText("ケースを作成"));

    expect(api.createCase).toHaveBeenCalledWith({
      clientName: "テスト太郎",
      clientId: "client-test",
      dateOfBirth: "1990-01-01",
      assignedStaffId: "staff-001",
    });

    await vi.waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("キャンセル"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when overlay is clicked", async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    const overlay = document.querySelector(".modal-overlay") as HTMLElement;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error alert on API failure", async () => {
    vi.mocked(api.createCase).mockRejectedValue(new Error("Network error"));
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("例: 山田 太郎"), "テスト太郎");
    await user.type(screen.getByPlaceholderText("例: client-001"), "client-test");
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "1990-01-01");
    await user.click(screen.getByText("ケースを作成"));

    await vi.waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("作成に失敗しました: Network error");
    });

    alertMock.mockRestore();
  });
});

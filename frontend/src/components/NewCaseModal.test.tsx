import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCaseModal } from "./NewCaseModal";
import { TestAuthWrapper } from "../test-utils";

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
    ...render(<TestAuthWrapper><NewCaseModal onClose={onClose} onCreated={onCreated} /></TestAuthWrapper>),
  };
}

describe("NewCaseModal", () => {
  it("renders form fields", () => {
    renderModal();

    expect(screen.getByText("新規ケース作成")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例: 山田 太郎")).toBeInTheDocument();
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
    await user.type(screen.getByPlaceholderText("例: C-00123"), "client-test");
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
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
    await user.type(screen.getByPlaceholderText("例: C-00123"), "client-test");
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "1990-01-01");

    await user.click(screen.getByText("ケースを作成"));

    expect(api.createCase).toHaveBeenCalledWith({
      clientName: "テスト太郎",
      clientId: "client-test",
      dateOfBirth: "1990-01-01",
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

  describe("ラベル・ヘルプテキスト改善", () => {
    it("相談者IDのラベルに補足説明を表示する", () => {
      renderModal();

      expect(screen.getByText(/住基番号・通所者番号等/)).toBeInTheDocument();
    });

    it("相談者IDのplaceholderが具体的な形式例になっている", () => {
      renderModal();

      expect(screen.getByPlaceholderText("例: C-00123")).toBeInTheDocument();
    });

    it("担当職員フィールドに自動割当の説明を表示する", () => {
      renderModal();

      expect(screen.getByText(/ログイン中の職員が自動で割り当てられます/)).toBeInTheDocument();
    });
  });

  describe("インラインエラー表示", () => {
    it("API失敗時にインラインエラーを表示する（alertではない）", async () => {
      vi.mocked(api.createCase).mockRejectedValue(new Error("Network error"));
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

      renderModal();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText("例: 山田 太郎"), "テスト太郎");
      await user.type(screen.getByPlaceholderText("例: C-00123"), "client-test");
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await user.type(dateInput, "1990-01-01");
      await user.click(screen.getByText("ケースを作成"));

      await waitFor(() => {
        expect(screen.getByText(/作成に失敗しました/)).toBeInTheDocument();
      });

      // alert()は呼ばれない
      expect(alertMock).not.toHaveBeenCalled();
      alertMock.mockRestore();
    });

    it("再送信でエラーがクリアされる", async () => {
      vi.mocked(api.createCase)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
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

      renderModal();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText("例: 山田 太郎"), "テスト太郎");
      await user.type(screen.getByPlaceholderText("例: C-00123"), "client-test");
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await user.type(dateInput, "1990-01-01");

      // 1回目: 失敗
      await user.click(screen.getByText("ケースを作成"));
      await waitFor(() => {
        expect(screen.getByText(/作成に失敗しました/)).toBeInTheDocument();
      });

      // 2回目: 成功 → エラーが消える
      await user.click(screen.getByText("ケースを作成"));
      await waitFor(() => {
        expect(screen.queryByText(/作成に失敗しました/)).not.toBeInTheDocument();
      });
    });
  });

  describe("成功フィードバック", () => {
    it("作成成功時にonCreatedが呼ばれる前に成功メッセージを表示しない（即閉じ）", async () => {
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
      await user.type(screen.getByPlaceholderText("例: C-00123"), "client-test");
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await user.type(dateInput, "1990-01-01");
      await user.click(screen.getByText("ケースを作成"));

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalled();
      });
    });
  });

  describe("無効ボタンのヒント", () => {
    it("必須項目未入力時にボタンのtitle属性で理由を表示する", () => {
      renderModal();

      const submitBtn = screen.getByText("ケースを作成");
      expect(submitBtn).toHaveAttribute("title");
      expect(submitBtn.getAttribute("title")).toMatch(/未入力/);
    });

    it("全項目入力後はtitle属性が消える", async () => {
      renderModal();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText("例: 山田 太郎"), "テスト太郎");
      await user.type(screen.getByPlaceholderText("例: C-00123"), "client-test");
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await user.type(dateInput, "1990-01-01");

      const submitBtn = screen.getByText("ケースを作成");
      expect(submitBtn).not.toHaveAttribute("title");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SupportPlanView } from "./SupportPlanView";
import { api } from "../api";
import type { SupportPlan } from "../api";

const MOCK_GOAL = {
  area: "住居",
  longTermGoal: "安定した住居の確保",
  shortTermGoal: "住居支援制度の申請",
  supports: ["住居確保給付金の申請支援", "不動産業者への同行"],
  frequency: "週1回",
  responsible: "担当支援員",
};

const MOCK_DRAFT: SupportPlan = {
  id: "plan-1",
  caseId: "case-1",
  staffId: "staff-1",
  status: "draft",
  clientName: "山田 太郎",
  clientId: "client-001",
  overallPolicy: "生活基盤の安定化を最優先に支援する",
  goals: [MOCK_GOAL],
  specialNotes: "アレルギーあり",
  planStartDate: "2026-04-01",
  nextReviewDate: "2026-09-30",
  createdAt: { _seconds: 1710000000 },
  updatedAt: { _seconds: 1710000000 },
};

const MOCK_CONFIRMED: SupportPlan = {
  ...MOCK_DRAFT,
  status: "confirmed",
  confirmedAt: { _seconds: 1710100000 },
};

const onUpdate = vi.fn();

beforeEach(() => {
  onUpdate.mockReset();
  vi.mocked(api.generateSupportPlanDraft).mockReset();
  vi.mocked(api.updateSupportPlan).mockReset();
});

describe("SupportPlanView", () => {
  describe("空状態", () => {
    it("plan=nullのとき生成ボタンを表示する", () => {
      render(<SupportPlanView caseId="case-1" plan={null} onUpdate={onUpdate} />);

      expect(screen.getByText("支援計画書がありません")).toBeInTheDocument();
      expect(screen.getByText("AI下書きを生成")).toBeInTheDocument();
    });

    it("生成ボタンクリックでAPIを呼び出す", async () => {
      vi.mocked(api.generateSupportPlanDraft).mockResolvedValue({} as SupportPlan);
      render(<SupportPlanView caseId="case-1" plan={null} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("AI下書きを生成"));

      await waitFor(() => {
        expect(api.generateSupportPlanDraft).toHaveBeenCalledWith("case-1");
      });
      expect(onUpdate).toHaveBeenCalled();
    });

    it("生成中はボタンが無効化される", async () => {
      vi.mocked(api.generateSupportPlanDraft).mockImplementation(
        () => new Promise(() => {}) // never resolves
      );
      render(<SupportPlanView caseId="case-1" plan={null} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("AI下書きを生成"));

      expect(screen.getByText("生成中...")).toBeDisabled();
    });

    it("生成失敗時にエラーを表示する", async () => {
      vi.mocked(api.generateSupportPlanDraft).mockRejectedValue(
        new Error("AI生成に失敗しました")
      );
      render(<SupportPlanView caseId="case-1" plan={null} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("AI下書きを生成"));

      await waitFor(() => {
        expect(screen.getByText("AI生成に失敗しました")).toBeInTheDocument();
      });
    });
  });

  describe("下書き表示", () => {
    it("下書きステータスバッジとコンテンツを表示する", () => {
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);

      expect(screen.getByText("下書き")).toBeInTheDocument();
      expect(screen.getByText("生活基盤の安定化を最優先に支援する")).toBeInTheDocument();
      expect(screen.getByText("住居")).toBeInTheDocument();
      expect(screen.getByText("安定した住居の確保")).toBeInTheDocument();
      expect(screen.getByText("住居支援制度の申請")).toBeInTheDocument();
      expect(screen.getByText("アレルギーあり")).toBeInTheDocument();
    });

    it("再生成・編集・確定ボタンを表示する", () => {
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);

      expect(screen.getByText("再生成")).toBeInTheDocument();
      expect(screen.getByText("編集")).toBeInTheDocument();
      expect(screen.getByText("確定")).toBeInTheDocument();
    });

    it("再生成ボタンで確認ダイアログを表示する", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("再生成"));

      expect(confirmSpy).toHaveBeenCalledWith(
        "現在の下書きを上書きして再生成しますか？手動で編集した内容は失われます。"
      );
      expect(api.generateSupportPlanDraft).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("再生成でconfirm承認時にAPIを呼び出す", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(api.generateSupportPlanDraft).mockResolvedValue({} as SupportPlan);
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("再生成"));

      await waitFor(() => {
        expect(api.generateSupportPlanDraft).toHaveBeenCalledWith("case-1");
      });
      expect(onUpdate).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("メタ情報を表示する", () => {
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);

      expect(screen.getByText(/2026-04-01/)).toBeInTheDocument();
      expect(screen.getByText(/2026-09-30/)).toBeInTheDocument();
    });
  });

  describe("編集モード", () => {
    it("編集ボタンで編集モードに切り替わる", async () => {
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("編集"));

      expect(screen.getByText("キャンセル")).toBeInTheDocument();
      expect(screen.getByText("保存")).toBeInTheDocument();
      // 再生成・確定ボタンは非表示
      expect(screen.queryByText("再生成")).not.toBeInTheDocument();
      expect(screen.queryByText("確定")).not.toBeInTheDocument();
    });

    it("キャンセルで編集モードを終了する", async () => {
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("編集"));
      await user.click(screen.getByText("キャンセル"));

      expect(screen.getByText("再生成")).toBeInTheDocument();
      expect(screen.getByText("編集")).toBeInTheDocument();
    });

    it("保存ボタンでAPI呼び出しと編集モード終了", async () => {
      vi.mocked(api.updateSupportPlan).mockResolvedValue({} as SupportPlan);
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("編集"));
      await user.click(screen.getByText("保存"));

      await waitFor(() => {
        expect(api.updateSupportPlan).toHaveBeenCalledWith(
          "case-1",
          "plan-1",
          expect.objectContaining({ overallPolicy: "生活基盤の安定化を最優先に支援する" })
        );
      });
      expect(onUpdate).toHaveBeenCalled();
    });

    it("保存失敗時にエラーを表示する", async () => {
      vi.mocked(api.updateSupportPlan).mockRejectedValue(new Error("保存に失敗しました"));
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("編集"));
      await user.click(screen.getByText("保存"));

      await waitFor(() => {
        expect(screen.getByText("保存に失敗しました")).toBeInTheDocument();
      });
    });
  });

  describe("確定", () => {
    it("確定ボタンでconfirmダイアログを表示する", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("確定"));

      expect(confirmSpy).toHaveBeenCalledWith(
        "この支援計画書を確定しますか？確定後は編集できなくなります。"
      );
      expect(api.updateSupportPlan).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("confirm承認でAPIを呼び出す", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(api.updateSupportPlan).mockResolvedValue({} as SupportPlan);
      render(<SupportPlanView caseId="case-1" plan={MOCK_DRAFT} onUpdate={onUpdate} />);
      const user = userEvent.setup();

      await user.click(screen.getByText("確定"));

      await waitFor(() => {
        expect(api.updateSupportPlan).toHaveBeenCalledWith(
          "case-1",
          "plan-1",
          { status: "confirmed" }
        );
      });
      expect(onUpdate).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });

  describe("確定済み表示", () => {
    it("確定ステータスバッジを表示する", () => {
      render(<SupportPlanView caseId="case-1" plan={MOCK_CONFIRMED} onUpdate={onUpdate} />);

      expect(screen.getByText("確定")).toBeInTheDocument();
    });

    it("編集・再生成・確定ボタンを非表示にする", () => {
      render(<SupportPlanView caseId="case-1" plan={MOCK_CONFIRMED} onUpdate={onUpdate} />);

      expect(screen.queryByText("編集")).not.toBeInTheDocument();
      expect(screen.queryByText("再生成")).not.toBeInTheDocument();
      // 「確定」はバッジとして表示されるが、ボタンとしては非表示
      const buttons = screen.queryAllByRole("button");
      const confirmButton = buttons.find((b) => b.textContent === "確定" && b.classList.contains("btn"));
      expect(confirmButton).toBeUndefined();
    });

    it("確定日を表示する", () => {
      render(<SupportPlanView caseId="case-1" plan={MOCK_CONFIRMED} onUpdate={onUpdate} />);

      expect(screen.getByText(/確定日/)).toBeInTheDocument();
    });
  });
});

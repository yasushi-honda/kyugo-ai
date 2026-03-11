import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonitoringSheetView } from "./MonitoringSheetView";
import { api } from "../api";
import type { MonitoringSheet } from "../api";

const MOCK_GOAL_EVAL = {
  area: "住居",
  longTermGoal: "安定した住居の確保",
  shortTermGoal: "住居支援制度の申請",
  progress: "improved" as const,
  evaluation: "住居確保給付金の申請が完了",
  nextAction: "不動産業者との契約支援を継続",
};

const MOCK_DRAFT: MonitoringSheet = {
  id: "sheet-1",
  caseId: "case-1",
  supportPlanId: "plan-1",
  staffId: "staff-1",
  status: "draft",
  monitoringDate: "2026-04-15",
  overallEvaluation: "全体的に改善傾向にある",
  goalEvaluations: [MOCK_GOAL_EVAL],
  environmentChanges: "転居予定あり",
  clientFeedback: "支援に感謝している",
  specialNotes: "次回は就労支援も検討",
  nextMonitoringDate: "2026-07-15",
  createdAt: { _seconds: 1710000000 },
  updatedAt: { _seconds: 1710000000 },
};

const MOCK_CONFIRMED: MonitoringSheet = {
  ...MOCK_DRAFT,
  status: "confirmed",
  confirmedAt: { _seconds: 1710100000 },
};

const onUpdate = vi.fn();

beforeEach(() => {
  onUpdate.mockReset();
  vi.mocked(api.generateMonitoringDraft).mockReset();
  vi.mocked(api.updateMonitoringSheet).mockReset();
});

describe("MonitoringSheetView", () => {
  describe("空状態", () => {
    it("支援計画書未確定のとき生成ボタンを無効化し案内を表示する", () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={null} hasSupportPlan={false} onUpdate={onUpdate} />
      );

      expect(screen.getByText("モニタリングシートがありません")).toBeInTheDocument();
      expect(screen.getByText(/先に支援計画書を確定してください/)).toBeInTheDocument();
      expect(screen.getByText("AI下書きを生成")).toBeDisabled();
    });

    it("支援計画書確定済みのとき生成ボタンを有効化する", () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={null} hasSupportPlan={true} onUpdate={onUpdate} />
      );

      expect(screen.getByText(/支援計画書をもとに/)).toBeInTheDocument();
      expect(screen.getByText("AI下書きを生成")).toBeEnabled();
    });

    it("生成ボタンクリックでAPIを呼び出す", async () => {
      vi.mocked(api.generateMonitoringDraft).mockResolvedValue({} as MonitoringSheet);
      render(
        <MonitoringSheetView caseId="case-1" sheet={null} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("AI下書きを生成"));

      await waitFor(() => {
        expect(api.generateMonitoringDraft).toHaveBeenCalledWith("case-1");
      });
      expect(onUpdate).toHaveBeenCalled();
    });

    it("生成失敗時にエラーを表示する", async () => {
      vi.mocked(api.generateMonitoringDraft).mockRejectedValue(new Error("生成に失敗しました"));
      render(
        <MonitoringSheetView caseId="case-1" sheet={null} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("AI下書きを生成"));

      await waitFor(() => {
        expect(screen.getByText("生成に失敗しました")).toBeInTheDocument();
      });
    });
  });

  describe("下書き表示", () => {
    it("下書きステータスバッジとコンテンツを表示する", () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );

      expect(screen.getByText("下書き")).toBeInTheDocument();
      expect(screen.getByText("全体的に改善傾向にある")).toBeInTheDocument();
      expect(screen.getByText("住居")).toBeInTheDocument();
      expect(screen.getByText("改善")).toBeInTheDocument();
      expect(screen.getByText("転居予定あり")).toBeInTheDocument();
      expect(screen.getByText("支援に感謝している")).toBeInTheDocument();
    });

    it("再生成・編集・確定ボタンを表示する", () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );

      expect(screen.getByText("再生成")).toBeInTheDocument();
      expect(screen.getByText("編集")).toBeInTheDocument();
      expect(screen.getByText("確定")).toBeInTheDocument();
    });

    it("再生成ボタンで確認ダイアログを表示する", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("再生成"));

      expect(confirmSpy).toHaveBeenCalledWith(
        "現在の下書きを上書きして再生成しますか？手動で編集した内容は失われます。"
      );
      expect(api.generateMonitoringDraft).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("再生成でconfirm承認時にAPIを呼び出す", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(api.generateMonitoringDraft).mockResolvedValue({} as MonitoringSheet);
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("再生成"));

      await waitFor(() => {
        expect(api.generateMonitoringDraft).toHaveBeenCalledWith("case-1");
      });
      expect(onUpdate).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("メタ情報を表示する", () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );

      expect(screen.getByText(/2026-04-15/)).toBeInTheDocument();
      expect(screen.getByText(/2026-07-15/)).toBeInTheDocument();
    });
  });

  describe("編集モード", () => {
    it("編集ボタンで編集モードに切り替わる", async () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("編集"));

      expect(screen.getByText("キャンセル")).toBeInTheDocument();
      expect(screen.getByText("保存")).toBeInTheDocument();
      expect(screen.queryByText("再生成")).not.toBeInTheDocument();
    });

    it("キャンセルで編集モードを終了する", async () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("編集"));
      await user.click(screen.getByText("キャンセル"));

      expect(screen.getByText("再生成")).toBeInTheDocument();
      expect(screen.getByText("編集")).toBeInTheDocument();
    });

    it("保存ボタンでAPI呼び出しと編集モード終了", async () => {
      vi.mocked(api.updateMonitoringSheet).mockResolvedValue({} as MonitoringSheet);
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("編集"));
      await user.click(screen.getByText("保存"));

      await waitFor(() => {
        expect(api.updateMonitoringSheet).toHaveBeenCalledWith(
          "case-1",
          "sheet-1",
          expect.objectContaining({ overallEvaluation: "全体的に改善傾向にある" })
        );
      });
      expect(onUpdate).toHaveBeenCalled();
    });

    it("保存失敗時にエラーを表示する", async () => {
      vi.mocked(api.updateMonitoringSheet).mockRejectedValue(new Error("保存に失敗しました"));
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );
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
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("確定"));

      expect(confirmSpy).toHaveBeenCalledWith(
        "このモニタリングシートを確定しますか？確定後は編集できなくなります。"
      );
      expect(api.updateMonitoringSheet).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("confirm承認でAPIを呼び出す", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(api.updateMonitoringSheet).mockResolvedValue({} as MonitoringSheet);
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("確定"));

      await waitFor(() => {
        expect(api.updateMonitoringSheet).toHaveBeenCalledWith(
          "case-1",
          "sheet-1",
          { status: "confirmed" }
        );
      });
      expect(onUpdate).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("確定処理中は再生成ボタンが無効化される", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(api.updateMonitoringSheet).mockReturnValue(new Promise(() => {}));
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_DRAFT} hasSupportPlan={true} onUpdate={onUpdate} />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("確定"));

      expect(screen.getByText("再生成").closest("button")).toBeDisabled();
      expect(screen.getByText("編集").closest("button")).toBeDisabled();
      confirmSpy.mockRestore();
    });
  });

  describe("確定済み表示", () => {
    it("確定ステータスバッジを表示する", () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_CONFIRMED} hasSupportPlan={true} onUpdate={onUpdate} />
      );

      expect(screen.getByText("確定")).toBeInTheDocument();
    });

    it("編集・再生成ボタンを非表示にする", () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_CONFIRMED} hasSupportPlan={true} onUpdate={onUpdate} />
      );

      expect(screen.queryByText("編集")).not.toBeInTheDocument();
      expect(screen.queryByText("再生成")).not.toBeInTheDocument();
    });

    it("確定日を表示する", () => {
      render(
        <MonitoringSheetView caseId="case-1" sheet={MOCK_CONFIRMED} hasSupportPlan={true} onUpdate={onUpdate} />
      );

      expect(screen.getByText(/確定日/)).toBeInTheDocument();
    });
  });
});

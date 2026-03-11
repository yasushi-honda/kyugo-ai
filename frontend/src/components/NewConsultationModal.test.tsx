import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewConsultationModal } from "./NewConsultationModal";
import { TestAuthWrapper } from "../test-utils";

import { api, ApiError } from "../api";
import { MockMediaRecorder } from "../__mocks__/MockMediaRecorder";

beforeEach(() => {
  vi.mocked(api.createConsultation).mockReset();
  vi.mocked(api.createAudioConsultation).mockReset();
  vi.mocked(api.getConsultation).mockReset();
  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderModal(props?: Partial<{ caseId: string; onClose: () => void; onCreated: () => void }>) {
  const onClose = props?.onClose ?? vi.fn();
  const onCreated = props?.onCreated ?? vi.fn();
  const caseId = props?.caseId ?? "case-1";
  return {
    onClose,
    onCreated,
    ...render(<TestAuthWrapper><NewConsultationModal caseId={caseId} onClose={onClose} onCreated={onCreated} /></TestAuthWrapper>),
  };
}

describe("NewConsultationModal", () => {
  it("renders with text mode by default", () => {
    renderModal();

    expect(screen.getByText("新規相談記録")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/相談者の状況/)).toBeInTheDocument();
  });

  it("switches to audio mode and shows record option by default", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("音声"));

    expect(screen.getByText("録音開始")).toBeInTheDocument();
    expect(screen.getByText(/ボタンを押してマイクから録音を開始します/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/相談者の状況/)).not.toBeInTheDocument();
  });

  it("switches to file upload sub-mode", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("音声"));
    await user.click(screen.getByText(/ファイルを選択/));

    expect(screen.getByText(/クリックして音声ファイルを選択/)).toBeInTheDocument();
  });

  it("disables submit when text content is empty", () => {
    renderModal();

    const submitBtn = screen.getByText("相談を記録");
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit when text content is filled", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/相談者の状況/), "テスト相談内容");

    const submitBtn = screen.getByText("相談を記録");
    expect(submitBtn).not.toBeDisabled();
  });

  it("calls createConsultation in text mode", async () => {
    vi.mocked(api.createConsultation).mockResolvedValue({
      id: "cons-1",
      caseId: "case-1",
      staffId: "test-staff-001",
      content: "テスト内容",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "counter",
      aiStatus: "completed",
      createdAt: { _seconds: 1700000000 },
      updatedAt: { _seconds: 1700000000 },
    });

    const { onCreated } = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/相談者の状況/), "テスト内容");
    await user.click(screen.getByText("相談を記録"));

    expect(api.createConsultation).toHaveBeenCalledWith("case-1", {
      content: "テスト内容",
      consultationType: "counter",
    });

    await vi.waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });
  });

  it("does not send staffId in audio mode (server uses req.user)", async () => {
    vi.mocked(api.createAudioConsultation).mockResolvedValue({
      id: "cons-1",
      caseId: "case-1",
      staffId: "test-staff-001",
      content: "",
      transcript: "text",
      summary: "summary",
      suggestedSupports: [],
      consultationType: "counter",
      aiStatus: "completed",
      createdAt: { _seconds: 1700000000 },
      updatedAt: { _seconds: 1700000000 },
    });

    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("音声"));
    await user.click(screen.getByText(/ファイルを選択/));
    const file = new File(["audio-data"], "test.wav", { type: "audio/wav" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);
    await user.click(screen.getByText("音声を分析・記録"));

    await vi.waitFor(() => {
      expect(api.createAudioConsultation).toHaveBeenCalled();
    });

    const formData = vi.mocked(api.createAudioConsultation).mock.calls[0][1] as FormData;
    expect(formData.get("staffId")).toBeNull();
  });

  it("shows AI result after audio submission", async () => {
    vi.mocked(api.createAudioConsultation).mockResolvedValue({
      id: "cons-1",
      caseId: "case-1",
      staffId: "test-staff-001",
      content: "",
      transcript: "音声のテキスト",
      summary: "AI要約テスト",
      suggestedSupports: [
        { menuId: "m1", menuName: "生活保護", reason: "収入が低い", relevanceScore: 0.9 },
      ],
      consultationType: "counter",
      aiStatus: "completed",
      createdAt: { _seconds: 1700000000 },
      updatedAt: { _seconds: 1700000000 },
    });

    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("音声"));
    await user.click(screen.getByText(/ファイルを選択/));
    const file = new File(["audio-data"], "test.wav", { type: "audio/wav" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await user.click(screen.getByText("音声を分析・記録"));

    await vi.waitFor(() => {
      expect(screen.getByText("AI分析結果")).toBeInTheDocument();
    });
    expect(screen.getByText("音声のテキスト")).toBeInTheDocument();
    expect(screen.getByText("AI要約テスト")).toBeInTheDocument();
    expect(screen.getByText("生活保護")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("キャンセル"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows audio source toggle buttons in audio mode", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("音声"));

    expect(screen.getByText(/録音する/)).toBeInTheDocument();
    expect(screen.getByText(/ファイルを選択/)).toBeInTheDocument();
  });

  it("disables submit in audio record mode when no recording", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("音声"));

    expect(screen.getByText("音声を分析・記録")).toBeDisabled();
  });

  it("falls back to file upload when MediaRecorder is unavailable", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("音声"));

    expect(screen.getByText(/クリックして音声ファイルを選択/)).toBeInTheDocument();
    expect(screen.queryByText(/録音する/)).not.toBeInTheDocument();
  });

  it("resets audioSource to record when switching back to text then audio", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("音声"));
    await user.click(screen.getByText(/ファイルを選択/));
    expect(screen.getByText(/クリックして音声ファイルを選択/)).toBeInTheDocument();

    await user.click(screen.getByText("テキスト入力"));

    await user.click(screen.getByText("音声"));
    expect(screen.getByText("録音開始")).toBeInTheDocument();
  });

  // ===== Issue #121 UX改善テスト =====

  describe("相談種別の説明", () => {
    it("相談種別に説明文を表示する", () => {
      renderModal();

      expect(screen.getByText(/対面での相談/)).toBeInTheDocument();
    });
  });

  describe("文字数カウンター", () => {
    it("テキストモードで文字数カウンターを表示する", async () => {
      renderModal();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText(/相談者の状況/), "テスト");

      expect(screen.getByText(/3文字/)).toBeInTheDocument();
    });

    it("空の状態では0文字と表示する", () => {
      renderModal();

      expect(screen.getByText(/0文字/)).toBeInTheDocument();
    });
  });

  describe("インラインエラー表示", () => {
    it("テキスト送信失敗時にインラインエラーを表示する（alertではない）", async () => {
      vi.mocked(api.createConsultation).mockRejectedValue(new Error("Network error"));
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

      renderModal();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText(/相談者の状況/), "テスト内容");
      await user.click(screen.getByText("相談を記録"));

      await waitFor(() => {
        expect(screen.getByText(/送信に失敗しました/)).toBeInTheDocument();
      });

      expect(alertMock).not.toHaveBeenCalled();
      alertMock.mockRestore();
    });

    it("再送信時にエラーがクリアされる", async () => {
      vi.mocked(api.createConsultation)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          id: "cons-1",
          caseId: "case-1",
          staffId: "test-staff-001",
          content: "テスト内容",
          transcript: "",
          summary: "",
          suggestedSupports: [],
          consultationType: "counter",
          aiStatus: "completed",
          createdAt: { _seconds: 1700000000 },
          updatedAt: { _seconds: 1700000000 },
        });

      renderModal();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText(/相談者の状況/), "テスト内容");
      await user.click(screen.getByText("相談を記録"));

      await waitFor(() => {
        expect(screen.getByText(/送信に失敗しました/)).toBeInTheDocument();
      });

      await user.click(screen.getByText("相談を記録"));

      await waitFor(() => {
        expect(screen.queryByText(/送信に失敗しました/)).not.toBeInTheDocument();
      });
    });
  });

  describe("ファイルアップロードUI", () => {
    it("ファイルアップロード領域にボタンスタイルのテキストを表示する", async () => {
      renderModal();
      const user = userEvent.setup();

      await user.click(screen.getByText("音声"));
      await user.click(screen.getByText(/ファイルを選択/));

      expect(screen.getByText(/ファイルを選ぶ/)).toBeInTheDocument();
    });
  });

  describe("ポーリングエラー表示", () => {
    const pendingConsultation = {
      id: "cons-1",
      caseId: "case-1",
      staffId: "test-staff-001",
      content: "",
      transcript: "",
      summary: "",
      suggestedSupports: [],
      consultationType: "counter",
      aiStatus: "pending" as const,
      createdAt: { _seconds: 1700000000 },
      updatedAt: { _seconds: 1700000000 },
    };

    async function submitAudioAndStartPolling() {
      vi.mocked(api.createAudioConsultation).mockResolvedValue(pendingConsultation);
      renderModal();
      const user = userEvent.setup();
      await user.click(screen.getByText("音声"));
      await user.click(screen.getByText(/ファイルを選択/));
      const file = new File(["audio-data"], "test.wav", { type: "audio/wav" });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      await user.click(screen.getByText("音声を分析・記録"));
      await waitFor(() => {
        expect(screen.getByText(/AI分析中/)).toBeInTheDocument();
      });
    }

    it("AI分析中画面でポーリングエラーフラグが立つとメッセージ表示する", async () => {
      await submitAudioAndStartPolling();
    });

    it("一時エラー（5xx/ネットワーク）で再試行を継続する", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(api.getConsultation)
        .mockRejectedValueOnce(new ApiError("Internal Server Error", "UNKNOWN", 500))
        .mockResolvedValueOnce(pendingConsultation);

      await submitAudioAndStartPolling();

      // 1回目のポーリング: 500エラー → 再試行メッセージ表示
      await vi.advanceTimersByTimeAsync(5000);
      await waitFor(() => {
        expect(screen.getByText(/接続に問題があります/)).toBeInTheDocument();
      });

      // 2回目のポーリング: 成功 → エラー表示消える
      await vi.advanceTimersByTimeAsync(5000);
      await waitFor(() => {
        expect(screen.queryByText(/接続に問題があります/)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("恒久エラー（403）でポーリングを停止しエラー表示する", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(api.getConsultation)
        .mockRejectedValueOnce(new ApiError("Access denied", "EMAIL_DOMAIN_NOT_ALLOWED", 403));

      await submitAudioAndStartPolling();

      // 1回目のポーリング: 403 → 恒久エラー表示、再試行しない
      await vi.advanceTimersByTimeAsync(5000);
      await waitFor(() => {
        expect(screen.getByText(/アクセスが拒否されました/)).toBeInTheDocument();
      });
      // 再試行メッセージは表示されない
      expect(screen.queryByText(/自動的に再試行/)).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it("恒久エラー（404）でポーリングを停止しエラー表示する", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(api.getConsultation)
        .mockRejectedValueOnce(new ApiError("Not found", "UNKNOWN", 404));

      await submitAudioAndStartPolling();

      await vi.advanceTimersByTimeAsync(5000);
      await waitFor(() => {
        expect(screen.getByText(/アクセスが拒否されました/)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("ネットワークエラー（statusなし）で再試行を継続する", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(api.getConsultation)
        .mockRejectedValueOnce(new Error("Failed to fetch"))
        .mockResolvedValueOnce(pendingConsultation);

      await submitAudioAndStartPolling();

      // ネットワークエラー → 再試行メッセージ
      await vi.advanceTimersByTimeAsync(5000);
      await waitFor(() => {
        expect(screen.getByText(/接続に問題があります/)).toBeInTheDocument();
      });

      // 復旧 → エラー消える
      await vi.advanceTimersByTimeAsync(5000);
      await waitFor(() => {
        expect(screen.queryByText(/接続に問題があります/)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });
});

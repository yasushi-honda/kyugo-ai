import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewConsultationModal } from "./NewConsultationModal";
import { TestAuthWrapper } from "../test-utils";

import { api } from "../api";

beforeEach(() => {
  vi.mocked(api.createConsultation).mockReset();
  vi.mocked(api.createAudioConsultation).mockReset();
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

  it("switches to audio mode", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText(/音声ファイル/));

    expect(screen.getByText(/クリックして音声ファイルを選択/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/相談者の状況/)).not.toBeInTheDocument();
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
      createdAt: { _seconds: 1700000000 },
      updatedAt: { _seconds: 1700000000 },
    });

    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText(/音声ファイル/));
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
      createdAt: { _seconds: 1700000000 },
      updatedAt: { _seconds: 1700000000 },
    });

    renderModal();
    const user = userEvent.setup();

    // Switch to audio mode
    await user.click(screen.getByText(/音声ファイル/));

    // Simulate file selection
    const file = new File(["audio-data"], "test.wav", { type: "audio/wav" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    // Submit
    await user.click(screen.getByText("音声を分析・記録"));

    // Should show AI results
    await vi.waitFor(() => {
      expect(screen.getByText("AI分析結果")).toBeInTheDocument();
    });
    expect(screen.getByText("音声のテキスト")).toBeInTheDocument();
    expect(screen.getByText("AI要約テスト")).toBeInTheDocument();
    expect(screen.getByText("生活保護")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument(); // relevanceScore * 100
  });

  it("calls onClose when cancel is clicked", async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByText("キャンセル"));
    expect(onClose).toHaveBeenCalled();
  });
});

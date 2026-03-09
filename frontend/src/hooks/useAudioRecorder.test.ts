import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioRecorder } from "./useAudioRecorder";
import { MockMediaRecorder, MockMediaStream } from "../__mocks__/MockMediaRecorder";

beforeEach(() => {
  vi.useFakeTimers();

  // Mock navigator.mediaDevices.getUserMedia
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
    },
    writable: true,
    configurable: true,
  });

  // Mock MediaRecorder globally
  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useAudioRecorder", () => {
  it("initializes with idle state", () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.recordedFile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("starts recording and updates state", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.isPaused).toBe(false);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it("increments elapsed time during recording", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(1);
  });

  it("stops recording and produces a file", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordedFile).not.toBeNull();
    expect(result.current.recordedFile?.type).toBe("audio/webm");
  });

  it("pauses and resumes recording", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.isPaused).toBe(true);
    expect(result.current.isRecording).toBe(true);

    act(() => {
      result.current.resume();
    });

    expect(result.current.isPaused).toBe(false);
    expect(result.current.isRecording).toBe(true);
  });

  it("resets state and does not produce a file", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordedFile).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("sets error when microphone permission is denied", async () => {
    const permissionError = new DOMException("Permission denied", "NotAllowedError");
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(permissionError);

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBe("マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。");
  });

  it("sets generic error for non-permission failures", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(new Error("Device error"));

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe("マイクの初期化に失敗しました。");
  });

  it("cleans up on unmount during recording", async () => {
    const { result, unmount } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRecording).toBe(true);

    // Should not throw
    unmount();
  });

  it("reports isSupported true when MediaRecorder is available", () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.isSupported).toBe(true);
  });

  it("reports isSupported false when MediaRecorder is unavailable", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.isSupported).toBe(false);
  });

  it("aborts stale session when reset during getUserMedia", async () => {
    // Simulate slow getUserMedia that resolves after reset
    const mockStream = new MockMediaStream();
    let resolveGetUserMedia: (stream: MockMediaStream) => void;
    const slowPromise = new Promise<MockMediaStream>((resolve) => {
      resolveGetUserMedia = resolve;
    });
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValueOnce(slowPromise as unknown as Promise<MediaStream>);

    const { result } = renderHook(() => useAudioRecorder());

    // Start recording (getUserMedia is pending)
    let startPromise: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });

    // Reset while getUserMedia is still pending
    act(() => {
      result.current.reset();
    });

    // Now resolve getUserMedia — should be ignored (stale session)
    await act(async () => {
      resolveGetUserMedia!(mockStream);
      await startPromise!;
    });

    // Should NOT be recording because the session was invalidated
    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordedFile).toBeNull();
  });
});

import { vi } from "vitest";

/**
 * Behavioral mock for MediaRecorder.
 * - Stores stream/options on the instance
 * - stop() fires ondataavailable + onstop synchronously (simulates real behavior)
 *
 * Used by: useAudioRecorder.test.ts, NewConsultationModal.test.tsx
 */
export class MockMediaRecorder {
  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  stream: MediaStream;
  options?: { mimeType?: string };

  constructor(stream: MediaStream, options?: { mimeType?: string }) {
    this.stream = stream;
    this.options = options;
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(["audio-data"], { type: "audio/webm" }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  static isTypeSupported(type: string): boolean {
    return type === "audio/webm;codecs=opus";
  }
}

/**
 * Mock for MediaStream used in audio recording tests.
 */
export class MockMediaStream {
  getTracks() {
    return [{ stop: vi.fn() }];
  }
}

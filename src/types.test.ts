import { describe, it, expect } from "vitest";
import { VALID_STATUS_TRANSITIONS, CaseStatus, SUPPORTED_AUDIO_MIME_TYPES } from "./types.js";

describe("VALID_STATUS_TRANSITIONS", () => {
  it("active can transition to referred or closed", () => {
    expect(VALID_STATUS_TRANSITIONS.active).toEqual(["referred", "closed"]);
  });

  it("referred can transition to active or closed", () => {
    expect(VALID_STATUS_TRANSITIONS.referred).toEqual(["active", "closed"]);
  });

  it("closed is terminal (no transitions)", () => {
    expect(VALID_STATUS_TRANSITIONS.closed).toEqual([]);
  });

  it("all statuses are covered", () => {
    const statuses: CaseStatus[] = ["active", "referred", "closed"];
    expect(Object.keys(VALID_STATUS_TRANSITIONS).sort()).toEqual(statuses.sort());
  });

  it("no status has a dead-end except closed", () => {
    for (const [status, transitions] of Object.entries(VALID_STATUS_TRANSITIONS)) {
      if (status !== "closed") {
        expect(transitions.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("SUPPORTED_AUDIO_MIME_TYPES", () => {
  it("includes common audio formats", () => {
    expect(SUPPORTED_AUDIO_MIME_TYPES).toContain("audio/wav");
    expect(SUPPORTED_AUDIO_MIME_TYPES).toContain("audio/mp3");
    expect(SUPPORTED_AUDIO_MIME_TYPES).toContain("audio/mpeg");
    expect(SUPPORTED_AUDIO_MIME_TYPES).toContain("audio/mp4");
    expect(SUPPORTED_AUDIO_MIME_TYPES).toContain("audio/ogg");
    expect(SUPPORTED_AUDIO_MIME_TYPES).toContain("audio/flac");
    expect(SUPPORTED_AUDIO_MIME_TYPES).toContain("audio/webm");
  });

  it("does not include video formats", () => {
    for (const mime of SUPPORTED_AUDIO_MIME_TYPES) {
      expect(mime).toMatch(/^audio\//);
    }
  });
});

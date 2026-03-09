import { describe, it, expect } from "vitest";
import { formatDuration } from "./constants";

describe("formatDuration", () => {
  it("formats 0 seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("formats seconds under a minute", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formats exactly one minute", () => {
    expect(formatDuration(60)).toBe("1:00");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(125)).toBe("2:05");
  });

  it("formats large values (over an hour)", () => {
    expect(formatDuration(3600)).toBe("60:00");
    expect(formatDuration(3661)).toBe("61:01");
  });

  it("pads seconds to 2 digits", () => {
    expect(formatDuration(61)).toBe("1:01");
    expect(formatDuration(9)).toBe("0:09");
  });
});

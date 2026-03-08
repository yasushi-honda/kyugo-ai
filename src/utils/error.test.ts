import { describe, it, expect } from "vitest";
import { isTransientError } from "./error.js";

describe("isTransientError", () => {
  it("status 429 をtransientと判定する", () => {
    const err = Object.assign(new Error("Too Many Requests"), { status: 429 });
    expect(isTransientError(err)).toBe(true);
  });

  it("status 503 をtransientと判定する", () => {
    const err = Object.assign(new Error("Service Unavailable"), { status: 503 });
    expect(isTransientError(err)).toBe(true);
  });

  it("code 429 をtransientと判定する", () => {
    const err = Object.assign(new Error("Rate limit"), { code: 429 });
    expect(isTransientError(err)).toBe(true);
  });

  it("code 503 をtransientと判定する", () => {
    const err = Object.assign(new Error("Unavailable"), { code: 503 });
    expect(isTransientError(err)).toBe(true);
  });

  it("timeoutメッセージをtransientと判定する", () => {
    expect(isTransientError(new Error("Request timeout"))).toBe(true);
  });

  it("ETIMEDOUTメッセージをtransientと判定する", () => {
    expect(isTransientError(new Error("connect ETIMEDOUT"))).toBe(true);
  });

  it("ECONNRESETメッセージをtransientと判定する", () => {
    expect(isTransientError(new Error("connect ECONNRESET"))).toBe(true);
  });

  it("ECONNREFUSEDメッセージをtransientと判定する", () => {
    expect(isTransientError(new Error("connect ECONNREFUSED"))).toBe(true);
  });

  it("socket hang upメッセージをtransientと判定する", () => {
    expect(isTransientError(new Error("socket hang up"))).toBe(true);
  });

  it("status 400 をpermanentと判定する", () => {
    const err = Object.assign(new Error("Bad Request"), { status: 400 });
    expect(isTransientError(err)).toBe(false);
  });

  it("status 422 をpermanentと判定する", () => {
    const err = Object.assign(new Error("Unprocessable"), { status: 422 });
    expect(isTransientError(err)).toBe(false);
  });

  it("一般的なエラーメッセージをpermanentと判定する", () => {
    expect(isTransientError(new Error("Invalid request"))).toBe(false);
  });

  it("nullをpermanentと判定する", () => {
    expect(isTransientError(null)).toBe(false);
  });

  it("undefinedをpermanentと判定する", () => {
    expect(isTransientError(undefined)).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { errorHandler } from "./error-handler.js";

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from "../utils/logger.js";

describe("errorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 500 with generic message", () => {
    const req = { method: "GET", path: "/api/cases" } as Request;
    const jsonFn = vi.fn();
    const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    const res = { headersSent: false, status: statusFn } as unknown as Response;
    const next = vi.fn();

    errorHandler(new Error("DB connection pool exhausted"), req, res, next);

    expect(statusFn).toHaveBeenCalledWith(500);
    expect(jsonFn).toHaveBeenCalledWith({ error: "Internal server error" });
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith("Unhandled error", expect.objectContaining({
      error: "DB connection pool exhausted",
    }));
  });

  it("skips response when headers already sent", () => {
    const req = { method: "GET", path: "/api/cases" } as Request;
    const statusFn = vi.fn();
    const res = { headersSent: true, status: statusFn } as unknown as Response;
    const next = vi.fn();

    errorHandler(new Error("late error"), req, res, next);

    expect(statusFn).not.toHaveBeenCalled();
    expect(vi.mocked(logger.error)).toHaveBeenCalled();
  });
});

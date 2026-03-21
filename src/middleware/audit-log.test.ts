import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { auditLog } from "./audit-log.js";

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from "../utils/logger.js";

function createMockReqRes(overrides?: { path?: string; method?: string; user?: unknown }) {
  const finishCallbacks: (() => void)[] = [];
  const req = {
    path: overrides?.path ?? "/api/cases",
    method: overrides?.method ?? "GET",
    user: "user" in (overrides ?? {}) ? overrides!.user : { staffId: "staff-1" },
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
    get: vi.fn().mockReturnValue("test-agent"),
  } as unknown as Request;

  const res = {
    statusCode: 200,
    on: vi.fn((event: string, cb: () => void) => {
      if (event === "finish") finishCallbacks.push(cb);
    }),
  } as unknown as Response;

  return { req, res, triggerFinish: () => finishCallbacks.forEach((cb) => cb()) };
}

describe("auditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs API requests on finish", () => {
    const { req, res, triggerFinish } = createMockReqRes();
    const next = vi.fn();

    auditLog(req, res, next);
    expect(next).toHaveBeenCalled();

    triggerFinish();
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith("audit", expect.objectContaining({
      audit: expect.objectContaining({
        staffId: "staff-1",
        method: "GET",
        path: "/api/cases",
        statusCode: 200,
      }),
    }));
  });

  it("skips non-API paths", () => {
    const { req, res, triggerFinish } = createMockReqRes({ path: "/health" });
    const next = vi.fn();

    auditLog(req, res, next);
    triggerFinish();
    expect(vi.mocked(logger.info)).not.toHaveBeenCalled();
  });

  it("uses anonymous when user is not set", () => {
    const { req, res, triggerFinish } = createMockReqRes({ user: undefined });
    const next = vi.fn();

    auditLog(req, res, next);
    triggerFinish();
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith("audit", expect.objectContaining({
      audit: expect.objectContaining({ staffId: "anonymous" }),
    }));
  });
});

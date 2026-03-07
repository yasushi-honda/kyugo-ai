import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";

vi.mock("../config.js", () => ({
  firebaseAuth: {
    verifyIdToken: vi.fn(),
  },
  firestore: {
    collection: vi.fn(),
  },
}));

import { requireAuth } from "./auth.js";
import { firebaseAuth, firestore } from "../config.js";

function mockReqResNext(authHeader?: string) {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

beforeEach(() => {
  vi.mocked(firebaseAuth.verifyIdToken).mockReset();
});

describe("requireAuth middleware", () => {
  it("returns 401 when no Authorization header", async () => {
    const { req, res, next } = mockReqResNext();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authorization header with Bearer token is required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header has no Bearer prefix", async () => {
    const { req, res, next } = mockReqResNext("Basic abc123");

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(
      new Error("Decoding Firebase ID token failed"),
    );
    const { req, res, next } = mockReqResNext("Bearer invalid-token");

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is expired", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(
      new Error("Firebase ID token has expired"),
    );
    const { req, res, next } = mockReqResNext("Bearer expired-token");

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("auto-provisions staff document on first login", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "new-uid",
      email: "new@example.com",
      name: "New User",
    } as never);

    const mockSet = vi.fn().mockResolvedValue(undefined);
    const mockDoc = vi.fn().mockReturnValue({ id: "auto-staff-001", set: mockSet });
    const mockGet = vi.fn().mockResolvedValue({ empty: true, docs: [] });
    const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(firestore.collection).mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer new-user-token");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: "new-uid",
      email: "new@example.com",
      role: "staff",
    }));
    expect(req.user).toEqual({
      uid: "new-uid",
      email: "new@example.com",
      role: "staff",
      staffId: "auto-staff-001",
    });
  });

  it("calls next() and sets req.user when authentication succeeds", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "firebase-uid-1",
      email: "staff@example.com",
    } as never);

    const staffDoc = {
      id: "staff-001",
      data: () => ({ role: "staff", name: "Test Staff", email: "staff@example.com" }),
    };
    const mockGet = vi.fn().mockResolvedValue({ empty: false, docs: [staffDoc] });
    const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(firestore.collection).mockReturnValue({ where: mockWhere } as never);

    const { req, res, next } = mockReqResNext("Bearer valid-token");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      uid: "firebase-uid-1",
      email: "staff@example.com",
      role: "staff",
      staffId: "staff-001",
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("sets admin role from staff document", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "firebase-uid-admin",
      email: "admin@example.com",
    } as never);

    const staffDoc = {
      id: "admin-001",
      data: () => ({ role: "admin", name: "Admin", email: "admin@example.com" }),
    };
    const mockGet = vi.fn().mockResolvedValue({ empty: false, docs: [staffDoc] });
    const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(firestore.collection).mockReturnValue({ where: mockWhere } as never);

    const { req, res, next } = mockReqResNext("Bearer admin-token");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?.role).toBe("admin");
  });
});

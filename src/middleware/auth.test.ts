import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";

vi.mock("../config.js", () => ({
  firebaseAuth: {
    verifyIdToken: vi.fn(),
    getUser: vi.fn(),
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
  vi.mocked(firebaseAuth.getUser).mockReset();
  // Default: user is not disabled
  vi.mocked(firebaseAuth.getUser).mockResolvedValue({ disabled: false } as never);
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

  it("returns 403 when email is not verified (new user)", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "unverified-uid",
      email: "unverified@example.com",
      email_verified: false,
    } as never);

    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({ doc: mockDoc, where: mockWhere } as never);

    const { req, res, next } = mockReqResNext("Bearer unverified-token");

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Email not verified" });
  });

  it("returns 403 when email_verified is undefined (new user)", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "no-verified-field-uid",
      email: "nofield@example.com",
      // email_verified intentionally omitted (undefined)
    } as never);

    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({ doc: mockDoc, where: mockWhere } as never);

    const { req, res, next } = mockReqResNext("Bearer no-verified-token");

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Email not verified" });
  });

  it("returns 403 when email is undefined (new user)", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "no-email-uid",
      email_verified: true,
      // email intentionally omitted
    } as never);

    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({ doc: mockDoc, where: mockWhere } as never);

    const { req, res, next } = mockReqResNext("Bearer no-email-token");

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Email is required for auto-provisioning" });
  });

  it("treats empty ALLOWED_EMAIL_DOMAINS as unset (fail-open)", async () => {
    const originalEnv = process.env.ALLOWED_EMAIL_DOMAINS;
    process.env.ALLOWED_EMAIL_DOMAINS = "   ,  ,";

    vi.resetModules();
    vi.mock("../config.js", () => ({
      firebaseAuth: { verifyIdToken: vi.fn(), getUser: vi.fn() },
      firestore: { collection: vi.fn() },
    }));
    const { requireAuth: freshRequireAuth } = await import("./auth.js");
    const { firebaseAuth: freshFirebaseAuth, firestore: freshFirestore } = await import("../config.js");

    vi.mocked(freshFirebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "empty-env-uid",
      email: "user@anydomain.com",
      email_verified: true,
    } as never);
    vi.mocked(freshFirebaseAuth.getUser).mockResolvedValue({ disabled: false } as never);

    const mockCreate = vi.fn().mockResolvedValue(undefined);
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ id: "empty-env-uid", get: mockDocGet, create: mockCreate });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(freshFirestore.collection).mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer empty-env-token");

    await freshRequireAuth(req, res, next);

    // fail-open: 空のドメインリストは未設定扱い → auto-provision成功
    expect(next).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();

    process.env.ALLOWED_EMAIL_DOMAINS = originalEnv;
  });

  it("returns 401 when Bearer token is empty string", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(
      new Error("Decoding Firebase ID token failed"),
    );
    const { req, res, next } = mockReqResNext("Bearer ");

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when email domain is not allowed (new user)", async () => {
    // Set allowed domains for this test
    const originalEnv = process.env.ALLOWED_EMAIL_DOMAINS;
    process.env.ALLOWED_EMAIL_DOMAINS = "allowed.gov.jp";

    // Re-import to pick up env change
    vi.resetModules();
    vi.mock("../config.js", () => ({
      firebaseAuth: { verifyIdToken: vi.fn(), getUser: vi.fn() },
      firestore: { collection: vi.fn() },
    }));
    const { requireAuth: freshRequireAuth } = await import("./auth.js");
    const { firebaseAuth: freshFirebaseAuth, firestore: freshFirestore } = await import("../config.js");

    vi.mocked(freshFirebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "blocked-uid",
      email: "blocked@notallowed.com",
      email_verified: true,
    } as never);
    vi.mocked(freshFirebaseAuth.getUser).mockResolvedValue({ disabled: false } as never);

    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(freshFirestore.collection).mockReturnValue({ doc: mockDoc, where: mockWhere } as never);

    const { req, res, next } = mockReqResNext("Bearer blocked-token");

    await freshRequireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied: email domain not allowed" });

    process.env.ALLOWED_EMAIL_DOMAINS = originalEnv;
  });

  it("auto-provisions when email domain matches ALLOWED_EMAIL_DOMAINS", async () => {
    const originalEnv = process.env.ALLOWED_EMAIL_DOMAINS;
    process.env.ALLOWED_EMAIL_DOMAINS = "allowed.gov.jp,another.org";

    vi.resetModules();
    vi.mock("../config.js", () => ({
      firebaseAuth: { verifyIdToken: vi.fn(), getUser: vi.fn() },
      firestore: { collection: vi.fn() },
    }));
    const { requireAuth: freshRequireAuth } = await import("./auth.js");
    const { firebaseAuth: freshFirebaseAuth, firestore: freshFirestore } = await import("../config.js");

    vi.mocked(freshFirebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "allowed-uid",
      email: "user@allowed.gov.jp",
      email_verified: true,
    } as never);
    vi.mocked(freshFirebaseAuth.getUser).mockResolvedValue({ disabled: false } as never);

    const mockCreate = vi.fn().mockResolvedValue(undefined);
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ id: "allowed-uid", get: mockDocGet, create: mockCreate });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(freshFirestore.collection).mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer allowed-token");

    await freshRequireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();
    expect(req.user).toEqual({
      uid: "allowed-uid",
      email: "user@allowed.gov.jp",
      role: "staff",
      staffId: "allowed-uid",
    });

    process.env.ALLOWED_EMAIL_DOMAINS = originalEnv;
  });

  it("existing user bypasses email_verified and domain checks", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "existing-uid",
      email: "existing@notallowed.com",
      email_verified: false,
    } as never);

    const staffDoc = {
      id: "existing-staff-001",
      data: () => ({ role: "staff", name: "Existing", email: "existing@notallowed.com" }),
    };
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: false, size: 1, docs: [staffDoc] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({ doc: mockDoc, where: mockWhere } as never);

    const { req, res, next } = mockReqResNext("Bearer existing-token");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      uid: "existing-uid",
      email: "existing@notallowed.com",
      role: "staff",
      staffId: "existing-staff-001",
    });
  });

  it("auto-provisions staff document on first login (idempotent create)", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "new-uid",
      email: "new@example.com",
      email_verified: true,
      name: "New User",
    } as never);

    const mockCreate = vi.fn().mockResolvedValue(undefined);
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ id: "new-uid", get: mockDocGet, create: mockCreate });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer new-user-token");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockDoc).toHaveBeenCalledWith("new-uid");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: "new-uid",
      email: "new@example.com",
      role: "staff",
    }));
    expect(req.user).toEqual({
      uid: "new-uid",
      email: "new@example.com",
      role: "staff",
      staffId: "new-uid",
    });
  });

  it("handles concurrent auto-provision (ALREADY_EXISTS)", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "race-uid",
      email: "race@example.com",
      email_verified: true,
    } as never);

    const alreadyExistsErr = new Error("Document already exists") as Error & { code: number };
    alreadyExistsErr.code = 6; // gRPC ALREADY_EXISTS
    const mockCreate = vi.fn().mockRejectedValue(alreadyExistsErr);
    // First get() returns not found (primary lookup), second get() returns the doc (after ALREADY_EXISTS)
    const mockDocGet = vi.fn()
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({
        id: "race-uid",
        data: () => ({ role: "staff", email: "race@example.com", name: "" }),
      });
    const mockDoc = vi.fn().mockReturnValue({ id: "race-uid", create: mockCreate, get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer race-token");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockDocGet).toHaveBeenCalled();
    expect(req.user).toEqual({
      uid: "race-uid",
      email: "race@example.com",
      role: "staff",
      staffId: "race-uid",
    });
  });

  it("returns 500 when create() fails with non-ALREADY_EXISTS error", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "err-uid",
      email: "err@example.com",
      email_verified: true,
    } as never);

    const firestoreErr = new Error("Permission denied") as Error & { code: number };
    firestoreErr.code = 7; // gRPC PERMISSION_DENIED
    const mockCreate = vi.fn().mockRejectedValue(firestoreErr);
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ id: "err-uid", get: mockDocGet, create: mockCreate });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer err-token");

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("returns 500 when ALREADY_EXISTS doc has no data", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "nodata-uid",
      email: "nodata@example.com",
      email_verified: true,
    } as never);

    const alreadyExistsErr = new Error("Document already exists") as Error & { code: number };
    alreadyExistsErr.code = 6;
    const mockCreate = vi.fn().mockRejectedValue(alreadyExistsErr);
    // First get() → not found (primary), second get() → doc with no data (ALREADY_EXISTS recovery)
    const mockDocGet = vi.fn()
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({
        id: "nodata-uid",
        data: () => undefined,
      });
    const mockDoc = vi.fn().mockReturnValue({ id: "nodata-uid", create: mockCreate, get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer nodata-token");

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
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
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: false, size: 1, docs: [staffDoc] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({ doc: mockDoc, where: mockWhere } as never);

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

  it("returns 401 when token has been revoked", async () => {
    const revokedErr = new Error("Firebase ID token has been revoked");
    (revokedErr as Error & { code: string }).code = "auth/id-token-revoked";
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(revokedErr);

    const { req, res, next } = mockReqResNext("Bearer revoked-token");

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token has been revoked" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when user account is disabled", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "disabled-uid",
      email: "disabled@example.com",
    } as never);

    vi.mocked(firebaseAuth.getUser).mockResolvedValue({
      uid: "disabled-uid",
      disabled: true,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer disabled-user-token");

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "User account is disabled" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 500 when duplicate firebaseUid records found in legacy lookup", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "dup-uid",
      email: "dup@example.com",
    } as never);

    const staffDoc1 = { id: "staff-dup-001", data: () => ({ role: "staff" }) };
    const staffDoc2 = { id: "staff-dup-002", data: () => ({ role: "staff" }) };
    // doc(uid) returns not found → falls back to legacy where query
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    // Legacy query finds 2 duplicates → should fail closed
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: false, size: 2, docs: [staffDoc1, staffDoc2] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer dup-token");

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("uses doc(uid) as primary lookup for staff", async () => {
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: "direct-uid",
      email: "direct@example.com",
    } as never);

    // doc(uid).get() returns found → should use directly without where query
    const mockDocGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "direct-uid",
      data: () => ({ role: "admin", firebaseUid: "direct-uid", email: "direct@example.com" }),
    });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    const mockWhere = vi.fn();
    vi.mocked(firestore.collection).mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
    } as never);

    const { req, res, next } = mockReqResNext("Bearer direct-token");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockDoc).toHaveBeenCalledWith("direct-uid");
    expect(mockWhere).not.toHaveBeenCalled(); // No fallback needed
    expect(req.user).toEqual({
      uid: "direct-uid",
      email: "direct@example.com",
      role: "admin",
      staffId: "direct-uid",
    });
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
    const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
    const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet });
    const mockQueryGet = vi.fn().mockResolvedValue({ empty: false, size: 1, docs: [staffDoc] });
    const mockWhere = vi.fn().mockReturnValue({ get: mockQueryGet });
    vi.mocked(firestore.collection).mockReturnValue({ doc: mockDoc, where: mockWhere } as never);

    const { req, res, next } = mockReqResNext("Bearer admin-token");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?.role).toBe("admin");
  });
});

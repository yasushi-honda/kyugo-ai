import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock api module (individual tests can override specific methods)
vi.mock("./api", () => ({
  api: {
    getMe: vi.fn().mockResolvedValue({
      uid: "test-uid",
      email: "test@example.com",
      role: "staff",
      staffId: "test-staff-001",
    }),
    listCases: vi.fn().mockResolvedValue([]),
    getCase: vi.fn(),
    createCase: vi.fn(),
    updateCaseStatus: vi.fn(),
    listConsultations: vi.fn().mockResolvedValue([]),
    createConsultation: vi.fn(),
    createAudioConsultation: vi.fn(),
    listSupportMenus: vi.fn().mockResolvedValue([]),
  },
}));

// Mock Firebase Auth SDK
vi.mock("./firebase", () => ({
  auth: {
    currentUser: { uid: "test-uid", email: "test@example.com", getIdToken: vi.fn().mockResolvedValue("mock-token") },
    onAuthStateChanged: vi.fn((_, callback) => {
      callback({ uid: "test-uid", email: "test@example.com", getIdToken: vi.fn().mockResolvedValue("mock-token") });
      return vi.fn();
    }),
  },
}));

// Mock firebase/auth module
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_, callback) => {
    callback({ uid: "test-uid", email: "test@example.com", getIdToken: vi.fn().mockResolvedValue("mock-token") });
    return vi.fn();
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn().mockResolvedValue(null),
  GoogleAuthProvider: vi.fn(),
  getAuth: vi.fn(),
}));

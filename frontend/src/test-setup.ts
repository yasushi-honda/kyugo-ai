import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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
  getAuth: vi.fn(),
}));

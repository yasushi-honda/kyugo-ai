import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock api module (individual tests can override specific methods)
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    api: {
      getMe: vi.fn().mockResolvedValue({
        uid: "test-uid",
        email: "test@example.com",
        name: "テスト職員",
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
      getConsultation: vi.fn(),
      updateConsultation: vi.fn(),
      deleteConsultation: vi.fn().mockResolvedValue(undefined),
      listStaff: vi.fn().mockResolvedValue([]),
      listSupportMenus: vi.fn().mockResolvedValue([]),
      getAllowedEmails: vi.fn().mockResolvedValue({ emails: [], domains: [] }),
      updateAllowedEmails: vi.fn().mockResolvedValue({ emails: [], domains: [] }),
      listAdminStaff: vi.fn().mockResolvedValue([]),
      updateStaff: vi.fn(),
      generateSupportPlanDraft: vi.fn(),
      getSupportPlan: vi.fn().mockRejectedValue(new Error("Not found")),
      updateSupportPlan: vi.fn(),
      generateMonitoringDraft: vi.fn(),
      getMonitoringSheet: vi.fn().mockRejectedValue(new Error("Not found")),
      updateMonitoringSheet: vi.fn(),
      searchLegalInfo: vi.fn(),
      listLegalSearches: vi.fn().mockResolvedValue([]),
    },
  };
});

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
  GoogleAuthProvider: vi.fn(),
  getAuth: vi.fn(),
}));

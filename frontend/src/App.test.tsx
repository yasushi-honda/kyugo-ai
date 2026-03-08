import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoutes } from "./App";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { CaseDetail } from "./pages/CaseDetail";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { api } from "./api";
import type { UserInfo } from "./api";

function renderApp(path = "/") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
          </Routes>
        </Layout>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("App routing", () => {
  it("renders Dashboard on /", async () => {
    renderApp("/");

    await waitFor(() => {
      expect(screen.getByText("ケース一覧", { selector: "h1" })).toBeInTheDocument();
    });
  });

  it("renders CaseDetail on /cases/:id", async () => {
    renderApp("/cases/case-1");

    await waitFor(() => {
      expect(screen.getByText("ケースが見つかりません")).toBeInTheDocument();
    });
  });

  it("renders empty content for unknown routes", () => {
    renderApp("/unknown-path");

    // Layout should still render
    expect(screen.getByText("救護AI")).toBeInTheDocument();
    // But no page content (no dashboard or case detail)
    expect(screen.queryByText("ケース一覧", { selector: "h1" })).not.toBeInTheDocument();
  });
});

describe("Unauthenticated routing", () => {
  it("redirects to /login when user is not authenticated", async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      (callback as (user: null) => void)(null);
      return vi.fn();
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });

    // Restore the mock for other tests
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      (callback as (user: unknown) => void)({
        uid: "test-uid",
        email: "test@example.com",
        getIdToken: vi.fn().mockResolvedValue("mock-token"),
      });
      return vi.fn();
    });
  });
});

describe("Auth fetchMe race condition", () => {
  afterEach(() => {
    // Restore default onAuthStateChanged mock for other tests
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      (callback as (user: unknown) => void)({
        uid: "test-uid",
        email: "test@example.com",
        getIdToken: vi.fn().mockResolvedValue("mock-token"),
      });
      return vi.fn();
    });
  });

  it("discards stale fetchMe response when user changes rapidly", async () => {
    // Capture the onAuthStateChanged callback so we can fire it manually
    let authCallback!: (user: unknown) => void;
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      authCallback = callback as (user: unknown) => void;
      return vi.fn();
    });

    // First getMe: slow (controlled by resolveFirst)
    let resolveFirst!: (value: UserInfo | PromiseLike<UserInfo>) => void;
    vi.mocked(api.getMe)
      .mockImplementationOnce(() => new Promise<UserInfo>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({
        uid: "user-2",
        email: "second@example.com",
        name: "Second User",
        role: "staff",
        staffId: "staff-002",
      });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    // First user logs in — starts slow getMe
    authCallback({ uid: "user-1", email: "first@example.com", getIdToken: vi.fn().mockResolvedValue("token-1") });

    // Immediately switch to second user — starts fast getMe
    authCallback({ uid: "user-2", email: "second@example.com", getIdToken: vi.fn().mockResolvedValue("token-2") });

    // Second getMe resolves quickly
    await waitFor(() => {
      expect(screen.getByText("ケース一覧", { selector: "h1" })).toBeInTheDocument();
    });

    // Now resolve the stale first getMe — should be discarded
    resolveFirst({
      uid: "user-1",
      email: "stale@example.com",
      name: "Stale User",
      role: "staff",
      staffId: "staff-001",
    });

    await new Promise((r) => setTimeout(r, 50));

    // Stale data should not appear
    expect(screen.queryByText("stale@example.com")).not.toBeInTheDocument();
  });
});

describe("Auth error handling", () => {
  it("shows error message when getMe fails (half-login prevention)", async () => {
    vi.mocked(api.getMe).mockRejectedValueOnce(new Error("403 Forbidden"));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/職員情報の取得に失敗しました/)).toBeInTheDocument();
    });
  });

  it("calls logout when logout button is clicked on auth error", async () => {
    vi.mocked(api.getMe).mockRejectedValueOnce(new Error("403 Forbidden"));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ログアウト"));
    expect(signOut).toHaveBeenCalled();
  });

  it("shows fallback message when userInfo is null without explicit error", async () => {
    // getMe returns null (unexpected response) — userInfo stays null, no authError set
    vi.mocked(api.getMe).mockResolvedValueOnce(null as never);

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("職員情報を取得できませんでした")).toBeInTheDocument();
    });
    // Should NOT show protected content (Dashboard)
    expect(screen.queryByText("ケース一覧", { selector: "h1" })).not.toBeInTheDocument();
  });

  it("retries getMe when retry button is clicked", async () => {
    vi.mocked(api.getMe).mockRejectedValueOnce(new Error("Network error"));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/職員情報の取得に失敗しました/)).toBeInTheDocument();
    });

    // getMe will succeed on retry
    vi.mocked(api.getMe).mockResolvedValueOnce({
      uid: "test-uid",
      email: "test@example.com",
      name: "テスト職員",
      role: "staff",
      staffId: "test-staff-001",
    });

    fireEvent.click(screen.getByText("再試行"));

    await waitFor(() => {
      expect(screen.getByText("ケース一覧", { selector: "h1" })).toBeInTheDocument();
    });
  });

  it("disables buttons while retryGetMe is in progress", async () => {
    vi.mocked(api.getMe).mockRejectedValueOnce(new Error("Network error"));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("再試行")).toBeInTheDocument();
    });

    // Make getMe hang (never resolve) to test loading state
    let resolveGetMe!: (value: UserInfo | PromiseLike<UserInfo>) => void;
    vi.mocked(api.getMe).mockImplementationOnce(
      () => new Promise<UserInfo>((resolve) => { resolveGetMe = resolve; }),
    );

    fireEvent.click(screen.getByText("再試行"));

    // Buttons should be disabled during loading
    await waitFor(() => {
      expect(screen.getByText("再試行")).toBeDisabled();
      expect(screen.getByText("ログアウト")).toBeDisabled();
    });

    // Resolve to clean up
    resolveGetMe({
      uid: "test-uid",
      email: "test@example.com",
      name: "テスト職員",
      role: "staff",
      staffId: "test-staff-001",
    });
  });

  it("shows signOut error and force logout button when signOut fails", async () => {
    vi.mocked(api.getMe).mockRejectedValueOnce(new Error("403 Forbidden"));
    vi.mocked(signOut).mockRejectedValueOnce(new Error("Network error"));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ログアウト"));

    await waitFor(() => {
      expect(screen.getByText(/ログアウトに失敗しました/)).toBeInTheDocument();
    });
    expect(screen.getByText("強制ログアウト")).toBeInTheDocument();
  });

  it("force logout clears local state and redirects to login", async () => {
    vi.mocked(api.getMe).mockRejectedValueOnce(new Error("403 Forbidden"));
    vi.mocked(signOut).mockRejectedValueOnce(new Error("Network error"));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ログアウト"));

    await waitFor(() => {
      expect(screen.getByText("強制ログアウト")).toBeInTheDocument();
    });

    vi.mocked(signOut).mockClear();

    fireEvent.click(screen.getByText("強制ログアウト"));

    expect(signOut).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });
});

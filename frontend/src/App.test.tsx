import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { CaseDetail } from "./pages/CaseDetail";
import { onAuthStateChanged } from "firebase/auth";
import { api } from "./api";

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

function ProtectedRoute() {
  const { user, userInfo, loading, authError, logout } = useAuth();
  if (loading) return <div data-testid="loading">Loading</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (authError || !userInfo) {
    return (
      <div>
        <p>{authError ?? "職員情報を取得できませんでした"}</p>
        <button onClick={() => logout()}>ログアウト</button>
      </div>
    );
  }
  return <div data-testid="protected">Protected</div>;
}

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
            <Route path="/*" element={<ProtectedRoute />} />
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

describe("Auth error handling", () => {
  it("shows error message when getMe fails (half-login prevention)", async () => {
    vi.mocked(api.getMe).mockRejectedValueOnce(new Error("403 Forbidden"));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route path="/*" element={<ProtectedRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/職員情報の取得に失敗しました/)).toBeInTheDocument();
    });
  });
});

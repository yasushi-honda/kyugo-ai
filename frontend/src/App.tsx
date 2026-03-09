import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { CaseDetail } from "./pages/CaseDetail";
import { Login } from "./pages/Login";
import { Help } from "./pages/Help";
import { About } from "./pages/About";
import { Settings } from "./pages/Settings";

export function ProtectedRoutes() {
  const { user, userInfo, loading, retrying, authError, logoutError, logout, forceLogout, retryGetMe } = useAuth();

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>読み込み中...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (authError || !userInfo) {
    return (
      <div className="loading-overlay">
        <p>{authError ?? "職員情報を取得できませんでした"}</p>
        {logoutError && <p className="error-text">{logoutError}</p>}
        <div className="auth-error-actions">
          <button className="btn btn-primary" onClick={() => retryGetMe()} disabled={retrying}>再試行</button>
          <button className="btn btn-secondary" onClick={() => logout()} disabled={retrying}>ログアウト</button>
          {logoutError && <button className="btn btn-ghost btn-danger" onClick={() => forceLogout()}>強制ログアウト</button>}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/help" element={<Help />} />
        <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/about" element={<About />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { userInfo } = useAuth();
  if (!userInfo) return null;
  if (userInfo.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

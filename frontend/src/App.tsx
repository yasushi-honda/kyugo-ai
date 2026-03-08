import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { CaseDetail } from "./pages/CaseDetail";
import { Login } from "./pages/Login";

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
          <button onClick={() => retryGetMe()} disabled={retrying}>再試行</button>
          <button onClick={() => logout()} disabled={retrying}>ログアウト</button>
          {logoutError && <button onClick={() => forceLogout()}>強制ログアウト</button>}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
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
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

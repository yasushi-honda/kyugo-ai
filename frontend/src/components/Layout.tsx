import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

const NAV_ITEMS = [
  { path: "/", icon: "📋", label: "ケース一覧", adminOnly: false },
  { path: "/help", icon: "❓", label: "使い方ガイド", adminOnly: false },
  { path: "/settings", icon: "⚙", label: "アクセス設定", adminOnly: true },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userInfo, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => navigate("/")}>
            <div className="sidebar-brand-icon">救</div>
            <span>救護AI</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS
            .filter((item) => !item.adminOnly || userInfo?.role === "admin")
            .map((item) => (
            <div
              key={item.path}
              className={`sidebar-nav-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.email}</div>
          <button className="sidebar-logout" onClick={logout}>
            ログアウト
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

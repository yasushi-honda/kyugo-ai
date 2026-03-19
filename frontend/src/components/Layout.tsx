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
          <button type="button" className="sidebar-brand" onClick={() => navigate("/")}>
            <div className="sidebar-brand-icon">救</div>
            <span>救護AI</span>
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="メインナビゲーション">
          {NAV_ITEMS
            .filter((item) => !item.adminOnly || userInfo?.role === "admin")
            .map((item) => (
            <button
              type="button"
              key={item.path}
              className={`sidebar-nav-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              aria-current={location.pathname === item.path ? "page" : undefined}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </button>
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

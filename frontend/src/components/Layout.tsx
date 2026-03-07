import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { path: "/", icon: "📋", label: "ケース一覧" },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">救</div>
            <span>救護AI</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
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
          福祉相談業務AI支援システム v0.1
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

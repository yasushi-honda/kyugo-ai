import type { ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";

const CURRENT_YEAR = new Date().getFullYear();

export function PublicLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <nav className="about-nav">
        <div className="about-nav-inner">
          <div className="about-nav-brand" style={{ cursor: "pointer" }} onClick={() => navigate("/about")}>
            <div className="about-nav-brand-icon">救</div>
            <span>救護AI</span>
          </div>
          <button className="btn btn-primary about-nav-login" onClick={() => navigate("/login")}>
            ログイン
          </button>
        </div>
      </nav>

      {children}

      <footer className="about-footer">
        <div className="legal-footer-links">
          <Link to="/about">救護AIについて</Link>
          <Link to="/terms">利用規約</Link>
          <Link to="/privacy">プライバシーポリシー</Link>
        </div>
        <p>&copy; {CURRENT_YEAR} 救護AI — 福祉相談業務AI支援システム</p>
      </footer>
    </div>
  );
}

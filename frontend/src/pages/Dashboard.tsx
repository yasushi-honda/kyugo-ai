import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Case } from "../api";
import { NewCaseModal } from "../components/NewCaseModal";
import { useAuth } from "../contexts/AuthContext";
import { STATUS_LABELS, formatDate } from "../constants";

export function Dashboard() {
  const navigate = useNavigate();
  const { user, userInfo, authError } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCase, setShowNewCase] = useState(false);

  const loadCases = useCallback(async () => {
    if (!userInfo) return;
    setLoading(true);
    try {
      const data = await api.listCases();
      setCases(data);
    } catch (err) {
      console.error("Failed to load cases:", err);
    } finally {
      setLoading(false);
    }
  }, [userInfo]);

  useEffect(() => { loadCases(); }, [loadCases]);

  const stats = {
    total: cases.length,
    active: cases.filter((c) => c.status === "active").length,
    referred: cases.filter((c) => c.status === "referred").length,
    closed: cases.filter((c) => c.status === "closed").length,
  };

  return (
    <>
      <div className="page-header">
        <h1>ケース一覧</h1>
        <p className="page-header-subtitle">担当: {userInfo?.staffId ?? user?.email}</p>
      </div>
      <div className="page-body">
        {authError && (
          <div className="alert-error">{authError}</div>
        )}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">総ケース数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">対応中</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.referred}</div>
            <div className="stat-label">照会中</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.closed}</div>
            <div className="stat-label">終了</div>
          </div>
        </div>

        <div className="section-header">
          <h3>全ケース</h3>
          <button className="btn btn-accent" onClick={() => setShowNewCase(true)}>
            ＋ 新規ケース
          </button>
        </div>

        {loading ? (
          <div className="loading-overlay">
            <div className="spinner" />
            <span>読み込み中...</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-text">ケースがありません</p>
            <button className="btn btn-primary" onClick={() => setShowNewCase(true)}>
              最初のケースを作成
            </button>
          </div>
        ) : (
          <div className="case-grid">
            {cases.map((c) => (
              <div
                key={c.id}
                className="card case-card"
                onClick={() => navigate(`/cases/${c.id}`)}
              >
                <div className="card-body">
                  <div className="case-card-header">
                    <div>
                      <div className="case-card-name">{c.clientName}</div>
                      <div className="case-card-id">ID: {c.clientId}</div>
                    </div>
                    <span className={`badge badge-${c.status}`}>
                      <span className="badge-dot" />
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <div className="case-card-meta">
                    <div className="case-card-meta-item">
                      📅 {formatDate(c.createdAt)}
                    </div>
                    <div className="case-card-meta-item">
                      👤 {c.assignedStaffId}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewCase && (
        <NewCaseModal
          onClose={() => setShowNewCase(false)}
          onCreated={() => {
            setShowNewCase(false);
            loadCases();
          }}
        />
      )}
    </>
  );
}

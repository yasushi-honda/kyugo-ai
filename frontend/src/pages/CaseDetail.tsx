import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Case, Consultation } from "../api";
import { NewConsultationModal } from "../components/NewConsultationModal";

const STATUS_LABELS: Record<string, string> = {
  active: "対応中",
  referred: "照会中",
  closed: "終了",
};

const TYPE_LABELS: Record<string, string> = {
  visit: "訪問",
  counter: "窓口",
  phone: "電話",
  online: "オンライン",
};

function formatDateTime(ts: { _seconds: number }) {
  const d = new Date(ts._seconds * 1000);
  return d.toLocaleDateString("ja-JP") + " " + d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewConsultation, setShowNewConsultation] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, cons] = await Promise.all([
        api.getCase(id),
        api.listConsultations(id),
      ]);
      setCaseData(c);
      setConsultations(cons);
    } catch (err) {
      console.error("Failed to load case:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>読み込み中...</span>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <p className="empty-state-text">ケースが見つかりません</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>一覧に戻る</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="back-link" onClick={() => navigate("/")}>← ケース一覧に戻る</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>{caseData.clientName}</h1>
            <p className="page-header-subtitle">ID: {caseData.clientId}</p>
          </div>
          <span className={`badge badge-${caseData.status}`}>
            <span className="badge-dot" />
            {STATUS_LABELS[caseData.status]}
          </span>
        </div>
      </div>

      <div className="page-body">
        <div className="detail-layout">
          {/* Main: Consultation Timeline (Golden Ratio: 61.8%) */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
              <h3>相談記録</h3>
              <button className="btn btn-accent" onClick={() => setShowNewConsultation(true)}>
                ＋ 新規相談記録
              </button>
            </div>

            {consultations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <p className="empty-state-text">相談記録がありません</p>
                <button className="btn btn-primary" onClick={() => setShowNewConsultation(true)}>
                  最初の相談を記録
                </button>
              </div>
            ) : (
              <div className="consultation-timeline">
                {consultations.map((con) => (
                  <div key={con.id} className="consultation-item">
                    <div className="consultation-date">
                      {formatDateTime(con.createdAt)}
                    </div>
                    <div className="card">
                      <div className="card-body">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                          <span className="consultation-type-badge">
                            {TYPE_LABELS[con.consultationType] ?? con.consultationType}
                          </span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                            {con.staffId}
                          </span>
                        </div>

                        {con.content && (
                          <div className="consultation-content">{con.content}</div>
                        )}

                        {con.transcript && (
                          <div style={{ marginTop: "var(--space-4)" }}>
                            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
                              文字起こし
                            </div>
                            <div className="transcript-block">{con.transcript}</div>
                          </div>
                        )}

                        {con.summary && (
                          <div className="ai-panel">
                            <div className="ai-panel-header">
                              <div className="ai-panel-icon">AI</div>
                              AI分析結果
                            </div>
                            <div className="ai-summary">{con.summary}</div>
                            {con.suggestedSupports?.length > 0 && (
                              <div>
                                <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--ai-700)", marginBottom: "var(--space-2)" }}>
                                  提案された支援メニュー
                                </div>
                                {con.suggestedSupports.map((s, i) => (
                                  <div key={i} className="support-suggestion">
                                    <div className={`support-score ${s.relevanceScore >= 0.8 ? "score-high" : s.relevanceScore >= 0.5 ? "score-mid" : "score-low"}`}>
                                      {Math.round(s.relevanceScore * 100)}
                                    </div>
                                    <div>
                                      <div className="support-name">{s.menuName}</div>
                                      <div className="support-reason">{s.reason}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Case Info (Golden Ratio: 38.2%) */}
          <div className="detail-sidebar">
            <div className="card">
              <div className="card-body">
                <h4 style={{ marginBottom: "var(--space-4)" }}>ケース情報</h4>
                <div className="info-grid">
                  <div>
                    <div className="info-item-label">相談者ID</div>
                    <div className="info-item-value">{caseData.clientId}</div>
                  </div>
                  <div>
                    <div className="info-item-label">担当職員</div>
                    <div className="info-item-value">{caseData.assignedStaffId}</div>
                  </div>
                  <div>
                    <div className="info-item-label">生年月日</div>
                    <div className="info-item-value">
                      {new Date(caseData.dateOfBirth._seconds * 1000).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <div>
                    <div className="info-item-label">作成日</div>
                    <div className="info-item-value">
                      {new Date(caseData.createdAt._seconds * 1000).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: "var(--space-4)" }}>
              <div className="card-body">
                <h4 style={{ marginBottom: "var(--space-4)" }}>ステータス変更</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {caseData.status !== "closed" && (
                    <>
                      {caseData.status === "active" && (
                        <button
                          className="btn btn-secondary"
                          onClick={async () => {
                            await api.updateCaseStatus(caseData.id, "referred");
                            loadData();
                          }}
                        >
                          照会中に変更
                        </button>
                      )}
                      {caseData.status === "referred" && (
                        <button
                          className="btn btn-secondary"
                          onClick={async () => {
                            await api.updateCaseStatus(caseData.id, "active");
                            loadData();
                          }}
                        >
                          対応中に戻す
                        </button>
                      )}
                      <button
                        className="btn btn-ghost"
                        style={{ color: "var(--kuri-500)" }}
                        onClick={async () => {
                          if (confirm("このケースを終了しますか？")) {
                            await api.updateCaseStatus(caseData.id, "closed");
                            loadData();
                          }
                        }}
                      >
                        ケースを終了
                      </button>
                    </>
                  )}
                  {caseData.status === "closed" && (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>
                      このケースは終了しています
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNewConsultation && id && (
        <NewConsultationModal
          caseId={id}
          onClose={() => setShowNewConsultation(false)}
          onCreated={() => {
            setShowNewConsultation(false);
            loadData();
          }}
        />
      )}
    </>
  );
}

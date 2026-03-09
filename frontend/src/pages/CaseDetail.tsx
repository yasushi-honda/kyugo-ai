import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, buildStaffMap } from "../api";
import type { Case, Consultation } from "../api";
import { NewConsultationModal } from "../components/NewConsultationModal";
import { SuggestedSupports } from "../components/SuggestedSupports";
import { STATUS_LABELS, TYPE_LABELS, formatDate, formatDateTime } from "../constants";

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewConsultation, setShowNewConsultation] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [c, cons, staff] = await Promise.all([
        api.getCase(id),
        api.listConsultations(id),
        api.listStaff(),
      ]);
      setCaseData(c);
      setConsultations(cons);
      setStaffMap(buildStaffMap(staff));
    } catch (err) {
      console.error("Failed to load case:", err);
      setError((err as Error).message);
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

  if (error) {
    return (
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p className="empty-state-text">データの取得に失敗しました</p>
          <p className="empty-state-subtext">{error}</p>
          <div className="empty-state-actions">
            <button className="btn btn-primary" onClick={loadData}>再試行</button>
            <button className="btn btn-secondary" onClick={() => navigate("/")}>一覧に戻る</button>
          </div>
        </div>
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
        <div className="case-detail-header">
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
            <div className="section-header">
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
                        <div className="consultation-card-header">
                          <span className="consultation-type-badge">
                            {TYPE_LABELS[con.consultationType] ?? con.consultationType}
                          </span>
                          <span className="consultation-staff">{staffMap[con.staffId] ?? con.staffId}</span>
                        </div>

                        {con.content && (
                          <div className="consultation-content">{con.content}</div>
                        )}

                        {con.transcript && (
                          <div className="transcript-section">
                            <div className="transcript-label">文字起こし</div>
                            <div className="transcript-block">{con.transcript}</div>
                          </div>
                        )}

                        {(con.aiStatus === "pending" || con.aiStatus === "retrying") && (
                          <div className="ai-panel ai-panel-pending">
                            <div className="ai-panel-header">
                              <div className="ai-panel-icon">AI</div>
                              <span className="ai-status-pulse">AI分析中...</span>
                            </div>
                          </div>
                        )}

                        {con.aiStatus === "retry_pending" && (
                          <div className="ai-panel ai-panel-retry">
                            <div className="ai-panel-header">
                              <div className="ai-panel-icon">AI</div>
                              AI分析 再試行待ち
                            </div>
                          </div>
                        )}

                        {con.aiStatus === "error" && (
                          <div className="ai-panel ai-panel-error">
                            <div className="ai-panel-header">
                              <div className="ai-panel-icon ai-panel-icon-error">AI</div>
                              AI分析エラー
                            </div>
                            {con.aiErrorMessage && (
                              <div className="ai-error-message">{con.aiErrorMessage}</div>
                            )}
                          </div>
                        )}

                        {(con.aiStatus === "completed" || !con.aiStatus) && con.summary && (
                          <div className="ai-panel">
                            <div className="ai-panel-header">
                              <div className="ai-panel-icon">AI</div>
                              AI分析結果
                            </div>
                            <div className="ai-summary">{con.summary}</div>
                            {con.suggestedSupports?.length > 0 && (
                              <SuggestedSupports supports={con.suggestedSupports} />
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
                <h4 className="sidebar-card-title">ケース情報</h4>
                <div className="info-grid">
                  <div>
                    <div className="info-item-label">相談者ID</div>
                    <div className="info-item-value">{caseData.clientId}</div>
                  </div>
                  <div>
                    <div className="info-item-label">担当職員</div>
                    <div className="info-item-value">{staffMap[caseData.assignedStaffId] ?? caseData.assignedStaffId}</div>
                  </div>
                  <div>
                    <div className="info-item-label">生年月日</div>
                    <div className="info-item-value">{formatDate(caseData.dateOfBirth)}</div>
                  </div>
                  <div>
                    <div className="info-item-label">作成日</div>
                    <div className="info-item-value">{formatDate(caseData.createdAt)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card sidebar-card-gap">
              <div className="card-body">
                <h4 className="sidebar-card-title">ステータス変更</h4>
                <div className="status-actions">
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
                        className="btn btn-ghost btn-danger"
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
                    <p className="status-closed-text">このケースは終了しています</p>
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

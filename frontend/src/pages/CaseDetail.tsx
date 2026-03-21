import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, buildStaffMap, downloadCsv } from "../api";
import type { Case, Consultation, MonitoringSheet, SupportPlan } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { NewConsultationModal } from "../components/NewConsultationModal";
import { SuggestedSupports } from "../components/SuggestedSupports";
import { SupportPlanView } from "../components/SupportPlanView";
import { MonitoringSheetView } from "../components/MonitoringSheetView";
import { LegalSearchView } from "../components/LegalSearchView";
import { STATUS_LABELS, TYPE_LABELS, formatDate, formatDateTime } from "../constants";

type DetailTab = "consultations" | "support-plan" | "monitoring" | "legal-search";

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewConsultation, setShowNewConsultation] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("consultations");
  const [supportPlan, setSupportPlan] = useState<SupportPlan | null>(null);
  const [monitoringSheet, setMonitoringSheet] = useState<MonitoringSheet | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTranscript, setEditTranscript] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [c, cons, plan, monitoring, staff] = await Promise.all([
        api.getCase(id),
        api.listConsultations(id),
        api.getSupportPlan(id).catch(() => null),
        api.getMonitoringSheet(id).catch(() => null),
        api.listStaff().catch(() => [] as { id: string; name: string }[]),
      ]);
      setCaseData(c);
      setConsultations(cons);
      setSupportPlan(plan);
      setMonitoringSheet(monitoring);
      setStaffMap(buildStaffMap(staff));
    } catch (err) {
      console.error("Failed to load case:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // pending/retrying 状態の相談を自動ポーリングして更新
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const hasPending = consultations.some(
      (c) => c.aiStatus === "pending" || c.aiStatus === "retrying" || c.aiStatus === "retry_pending",
    );
    if (hasPending && id) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const cons = await api.listConsultations(id);
          setConsultations(cons);
          const stillPending = cons.some(
            (c) => c.aiStatus === "pending" || c.aiStatus === "retrying" || c.aiStatus === "retry_pending",
          );
          if (!stillPending && pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        } catch { /* ポーリング失敗は無視、次回リトライ */ }
      }, 5000);
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [consultations, id]);

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
          {/* Main: Tabbed Content (Golden Ratio: 61.8%) */}
          <div>
            <div className="detail-tabs">
              <button
                className={`detail-tab ${activeTab === "consultations" ? "active" : ""}`}
                onClick={() => setActiveTab("consultations")}
              >
                相談記録 ({consultations.length})
              </button>
              <button
                className={`detail-tab ${activeTab === "support-plan" ? "active" : ""}`}
                onClick={() => setActiveTab("support-plan")}
              >
                支援計画書 {supportPlan ? (supportPlan.status === "confirmed" ? "✓" : "") : ""}
              </button>
              <button
                className={`detail-tab ${activeTab === "monitoring" ? "active" : ""}`}
                onClick={() => setActiveTab("monitoring")}
              >
                モニタリング {monitoringSheet ? (monitoringSheet.status === "confirmed" ? "✓" : "") : ""}
              </button>
              <button
                className={`detail-tab ${activeTab === "legal-search" ? "active" : ""}`}
                onClick={() => setActiveTab("legal-search")}
              >
                法令検索
              </button>
            </div>

            {activeTab === "support-plan" && (
              <SupportPlanView caseId={id!} plan={supportPlan} onUpdate={loadData} />
            )}

            {activeTab === "monitoring" && (
              <MonitoringSheetView
                caseId={id!}
                sheet={monitoringSheet}
                hasSupportPlan={supportPlan?.status === "confirmed"}
                onUpdate={loadData}
              />
            )}

            {activeTab === "legal-search" && (
              <LegalSearchView key={id} caseId={id!} />
            )}

            {activeTab === "consultations" && (
            <>
            <div className="section-header">
              <h3>相談記録</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={async () => {
                    try {
                      await downloadCsv(`/api/cases/${id}/consultations/export/csv`, `consultations_${id}_${new Date().toISOString().slice(0, 10)}.csv`);
                    } catch (err) {
                      alert(`CSV出力に失敗しました: ${(err as Error).message}`);
                    }
                  }}
                  disabled={consultations.length === 0}
                >
                  CSV出力
                </button>
                <button className="btn btn-accent" onClick={() => setShowNewConsultation(true)}>
                  ＋ 新規相談記録
                </button>
              </div>
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
                {consultations.map((con) => {
                  const isOwnerOrAdmin = userInfo?.role === "admin" || con.staffId === userInfo?.staffId;
                  const isEditing = editingId === con.id;

                  return (
                  <div key={con.id} className="consultation-item">
                    <div className="consultation-date">
                      {formatDateTime(con.createdAt)}
                      {con.editedAt && (
                        <span className="edited-badge">
                          （{con.editedBy ? `${staffMap[con.editedBy] || con.editedBy} が編集` : "編集済み"}）
                        </span>
                      )}
                    </div>
                    <div className="card">
                      <div className="card-body">
                        <div className="consultation-card-header">
                          <span className="consultation-type-badge">
                            {TYPE_LABELS[con.consultationType] ?? con.consultationType}
                          </span>
                          <span className="consultation-staff">{staffMap[con.staffId] || `（名前未設定: ${con.staffId}）`}</span>
                          {isOwnerOrAdmin && !isEditing && (
                            <div className="consultation-menu-wrapper">
                              <button
                                className="consultation-menu-btn"
                                onClick={() => setMenuOpenId(menuOpenId === con.id ? null : con.id)}
                                aria-label="操作メニュー"
                              >
                                &#x22EF;
                              </button>
                              {menuOpenId === con.id && (
                                <div className="consultation-menu-dropdown">
                                  <button
                                    onClick={() => {
                                      setEditingId(con.id);
                                      setEditContent(con.content);
                                      setEditTranscript(con.transcript);
                                      setMenuOpenId(null);
                                    }}
                                  >
                                    編集
                                  </button>
                                  <button
                                    className="btn-danger-text"
                                    onClick={async () => {
                                      setMenuOpenId(null);
                                      if (confirm("この相談記録を削除しますか？")) {
                                        await api.deleteConsultation(id!, con.id);
                                        setConsultations((prev) => prev.filter((c) => c.id !== con.id));
                                      }
                                    }}
                                  >
                                    削除
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="consultation-edit-form">
                            <label className="edit-label">相談内容</label>
                            <textarea
                              className="edit-textarea"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={5}
                            />
                            {con.transcript && (
                              <>
                                <label className="edit-label">文字起こし</label>
                                <textarea
                                  className="edit-textarea"
                                  value={editTranscript}
                                  onChange={(e) => setEditTranscript(e.target.value)}
                                  rows={5}
                                />
                              </>
                            )}
                            <div className="edit-actions">
                              <button
                                className="btn btn-primary"
                                disabled={editSaving || !editContent.trim()}
                                onClick={async () => {
                                  setEditSaving(true);
                                  try {
                                    const update: { content?: string; transcript?: string } = {};
                                    if (editContent !== con.content) update.content = editContent;
                                    if (editTranscript !== con.transcript) update.transcript = editTranscript;
                                    if (Object.keys(update).length > 0) {
                                      const result = await api.updateConsultation(id!, con.id, update);
                                      setConsultations((prev) =>
                                        prev.map((c) => c.id === con.id ? result : c),
                                      );
                                    }
                                    setEditingId(null);
                                  } catch (err) {
                                    alert("保存に失敗しました: " + (err as Error).message);
                                  } finally {
                                    setEditSaving(false);
                                  }
                                }}
                              >
                                {editSaving ? "保存中..." : "保存"}
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => setEditingId(null)}
                                disabled={editSaving}
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {con.content && (
                              <div className="consultation-content">{con.content}</div>
                            )}

                            {con.transcript && (
                              <div className="transcript-section">
                                <div className="transcript-label">
                                  🎙️ 音声から文字起こし
                                  <button
                                    className="transcript-toggle"
                                    onClick={() => setExpandedTranscripts(prev => {
                                      const next = new Set(prev);
                                      if (next.has(con.id)) next.delete(con.id);
                                      else next.add(con.id);
                                      return next;
                                    })}
                                  >
                                    {expandedTranscripts.has(con.id) ? "折りたたむ ▲" : "全文を表示 ▼"}
                                  </button>
                                </div>
                                <div className={`transcript-block ${expandedTranscripts.has(con.id) ? "expanded" : "collapsed"}`}>
                                  {con.transcript}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {con.editedAt && con.aiStatus === "completed" && con.summary
                          && con.editedAt._seconds > con.updatedAt._seconds && (
                          <div className="ai-edit-notice">
                            AI分析結果は編集前の内容に基づいています
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
                            <p className="ai-summary">一時的なエラーが発生しました。自動的に再試行されます（5分以内）。</p>
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
                              AIによる要約
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
                  );
                })}
              </div>
            )}
            </>
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
                    <div className="info-item-value">{staffMap[caseData.assignedStaffId] || `（名前未設定: ${caseData.assignedStaffId}）`}</div>
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

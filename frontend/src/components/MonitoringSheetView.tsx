import { useState } from "react";
import { api } from "../api";
import type { MonitoringSheet, MonitoringGoalEvaluation } from "../api";
import { formatDateTime } from "../constants";

interface MonitoringSheetViewProps {
  caseId: string;
  sheet: MonitoringSheet | null;
  hasSupportPlan: boolean;
  onUpdate: () => void;
}

const PROGRESS_LABELS: Record<MonitoringGoalEvaluation["progress"], string> = {
  improved: "改善",
  maintained: "維持",
  declined: "後退",
  not_started: "未着手",
};

const PROGRESS_BADGE_CLASS: Record<MonitoringGoalEvaluation["progress"], string> = {
  improved: "badge-progress-improved",
  maintained: "badge-progress-maintained",
  declined: "badge-progress-declined",
  not_started: "badge-progress-not-started",
};

type EditData = {
  overallEvaluation: string;
  goalEvaluations: MonitoringGoalEvaluation[];
  environmentChanges: string;
  clientFeedback: string;
  specialNotes: string;
  monitoringDate: string;
  nextMonitoringDate: string;
};

export function MonitoringSheetView({ caseId, sheet, hasSupportPlan, onUpdate }: MonitoringSheetViewProps) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditData | null>(null);

  const editing = editData !== null;

  const updateGoalEval = (index: number, patch: Partial<MonitoringGoalEvaluation>) => {
    if (!editData) return;
    const goalEvaluations = [...editData.goalEvaluations];
    goalEvaluations[index] = { ...goalEvaluations[index], ...patch };
    setEditData({ ...editData, goalEvaluations });
  };

  const handleGenerate = async (isRegenerate = false) => {
    if (isRegenerate) {
      if (!confirm("現在の下書きを上書きして再生成しますか？手動で編集した内容は失われます。")) return;
    }
    setGenerating(true);
    setError(null);
    try {
      await api.generateMonitoringDraft(caseId);
      onUpdate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const startEditing = () => {
    if (!sheet) return;
    setEditData({
      overallEvaluation: sheet.overallEvaluation,
      goalEvaluations: sheet.goalEvaluations.map((g) => ({ ...g })),
      environmentChanges: sheet.environmentChanges,
      clientFeedback: sheet.clientFeedback,
      specialNotes: sheet.specialNotes,
      monitoringDate: sheet.monitoringDate,
      nextMonitoringDate: sheet.nextMonitoringDate,
    });
  };

  const handleSave = async () => {
    if (!sheet || !editData) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateMonitoringSheet(caseId, sheet.id, editData);
      setEditData(null);
      onUpdate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!sheet) return;
    if (!confirm("このモニタリングシートを確定しますか？確定後は編集できなくなります。")) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateMonitoringSheet(caseId, sheet.id, { status: "confirmed" });
      onUpdate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!sheet) {
    return (
      <div className="support-plan-empty">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-text">モニタリングシートがありません</p>
          <p className="empty-state-subtext">
            {hasSupportPlan
              ? "相談記録と支援計画書をもとに、モニタリングシートの下書きを自動生成します。"
              : "モニタリングシートを生成するには、先に支援計画書を確定してください。"}
          </p>
          <button
            className="btn btn-accent"
            onClick={() => handleGenerate()}
            disabled={generating || !hasSupportPlan}
          >
            {generating ? "生成中..." : "AI下書きを生成"}
          </button>
          {error && <p className="support-plan-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="support-plan">
      <div className="support-plan-header">
        <div>
          <h3>モニタリングシート</h3>
          <span className={`badge badge-plan-${sheet.status}`}>
            {sheet.status === "draft" ? "下書き" : "確定"}
          </span>
        </div>
        <div className="support-plan-actions">
          {sheet.status === "draft" && !editing && (
            <>
              <button className="btn btn-secondary" onClick={() => handleGenerate(true)} disabled={generating || saving}>
                {generating ? "再生成中..." : "再生成"}
              </button>
              <button className="btn btn-primary" onClick={startEditing}>
                編集
              </button>
              <button className="btn btn-accent" onClick={handleConfirm} disabled={saving}>
                確定
              </button>
            </>
          )}
          {editing && (
            <>
              <button className="btn btn-ghost" onClick={() => setEditData(null)}>
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="support-plan-error">{error}</p>}

      <div className="support-plan-meta">
        <span>作成日: {formatDateTime(sheet.createdAt)}</span>
        <span>モニタリング日: {sheet.monitoringDate}</span>
        <span>次回予定: {sheet.nextMonitoringDate}</span>
        {sheet.confirmedAt && <span>確定日: {formatDateTime(sheet.confirmedAt)}</span>}
      </div>

      <div className="support-plan-section">
        <h4>全体評価</h4>
        {editData ? (
          <textarea
            className="support-plan-textarea"
            value={editData.overallEvaluation}
            onChange={(e) => setEditData({ ...editData, overallEvaluation: e.target.value })}
          />
        ) : (
          <p className="support-plan-text">{sheet.overallEvaluation}</p>
        )}
      </div>

      <div className="support-plan-section">
        <h4>目標別進捗評価</h4>
        {(editData ? editData.goalEvaluations : sheet.goalEvaluations).map((goal, i) => (
          <div key={i} className="support-plan-goal">
            <div className="goal-area-badge">{goal.area}</div>
            <div className="monitoring-progress-row">
              <span className="goal-label">進捗:</span>
              {editData ? (
                <select
                  className="support-plan-select"
                  value={editData.goalEvaluations[i].progress}
                  onChange={(e) => updateGoalEval(i, { progress: e.target.value as MonitoringGoalEvaluation["progress"] })}
                >
                  <option value="improved">改善</option>
                  <option value="maintained">維持</option>
                  <option value="declined">後退</option>
                  <option value="not_started">未着手</option>
                </select>
              ) : (
                <span className={`badge ${PROGRESS_BADGE_CLASS[goal.progress]}`}>
                  {PROGRESS_LABELS[goal.progress]}
                </span>
              )}
            </div>
            <div className="goal-grid">
              <div>
                <div className="goal-label">長期目標</div>
                <p className="goal-ref-text">{goal.longTermGoal}</p>
              </div>
              <div>
                <div className="goal-label">短期目標</div>
                <p className="goal-ref-text">{goal.shortTermGoal}</p>
              </div>
            </div>
            <div>
              <div className="goal-label">達成状況の評価</div>
              {editData ? (
                <textarea
                  className="support-plan-input"
                  value={editData.goalEvaluations[i].evaluation}
                  onChange={(e) => updateGoalEval(i, { evaluation: e.target.value })}
                />
              ) : (
                <p>{goal.evaluation}</p>
              )}
            </div>
            <div>
              <div className="goal-label">今後の対応方針</div>
              {editData ? (
                <textarea
                  className="support-plan-input"
                  value={editData.goalEvaluations[i].nextAction}
                  onChange={(e) => updateGoalEval(i, { nextAction: e.target.value })}
                />
              ) : (
                <p>{goal.nextAction}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="support-plan-section">
        <h4>生活環境の変化</h4>
        {editData ? (
          <textarea
            className="support-plan-textarea"
            value={editData.environmentChanges}
            onChange={(e) => setEditData({ ...editData, environmentChanges: e.target.value })}
          />
        ) : (
          <p className="support-plan-text">{sheet.environmentChanges || "（なし）"}</p>
        )}
      </div>

      <div className="support-plan-section">
        <h4>本人の意向・感想</h4>
        {editData ? (
          <textarea
            className="support-plan-textarea"
            value={editData.clientFeedback}
            onChange={(e) => setEditData({ ...editData, clientFeedback: e.target.value })}
          />
        ) : (
          <p className="support-plan-text">{sheet.clientFeedback || "（なし）"}</p>
        )}
      </div>

      <div className="support-plan-section">
        <h4>特記事項</h4>
        {editData ? (
          <textarea
            className="support-plan-textarea"
            value={editData.specialNotes}
            onChange={(e) => setEditData({ ...editData, specialNotes: e.target.value })}
          />
        ) : (
          <p className="support-plan-text">{sheet.specialNotes || "（なし）"}</p>
        )}
      </div>
    </div>
  );
}

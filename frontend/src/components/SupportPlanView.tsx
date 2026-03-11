import { useState } from "react";
import { api } from "../api";
import type { SupportPlan, SupportPlanGoal } from "../api";
import { formatDateTime } from "../constants";

interface SupportPlanViewProps {
  caseId: string;
  plan: SupportPlan | null;
  onUpdate: () => void;
}

type EditData = {
  overallPolicy: string;
  goals: SupportPlanGoal[];
  specialNotes: string;
  planStartDate: string;
  nextReviewDate: string;
};

export function SupportPlanView({ caseId, plan, onUpdate }: SupportPlanViewProps) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditData | null>(null);

  const editing = editData !== null;

  const updateGoal = (index: number, patch: Partial<SupportPlanGoal>) => {
    if (!editData) return;
    const goals = [...editData.goals];
    goals[index] = { ...goals[index], ...patch };
    setEditData({ ...editData, goals });
  };

  const handleGenerate = async (isRegenerate = false) => {
    if (isRegenerate) {
      if (!confirm("現在の下書きを上書きして再生成しますか？手動で編集した内容は失われます。")) return;
    }
    setGenerating(true);
    setError(null);
    try {
      await api.generateSupportPlanDraft(caseId);
      onUpdate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const startEditing = () => {
    if (!plan) return;
    setEditData({
      overallPolicy: plan.overallPolicy,
      goals: plan.goals.map((g) => ({ ...g, supports: [...g.supports] })),
      specialNotes: plan.specialNotes,
      planStartDate: plan.planStartDate,
      nextReviewDate: plan.nextReviewDate,
    });
  };

  const handleSave = async () => {
    if (!plan || !editData) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateSupportPlan(caseId, plan.id, editData);
      setEditData(null);
      onUpdate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!plan) return;
    if (!confirm("この支援計画書を確定しますか？確定後は編集できなくなります。")) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateSupportPlan(caseId, plan.id, { status: "confirmed" });
      onUpdate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!plan) {
    return (
      <div className="support-plan-empty">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">支援計画書がありません</p>
          <p className="empty-state-subtext">
            相談記録のAI分析結果をもとに、個別支援計画書の下書きを自動生成します。
          </p>
          <button
            className="btn btn-accent"
            onClick={() => handleGenerate()}
            disabled={generating}
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
          <h3>個別支援計画書</h3>
          <span className={`badge badge-plan-${plan.status}`}>
            {plan.status === "draft" ? "下書き" : "確定"}
          </span>
        </div>
        <div className="support-plan-actions">
          {plan.status === "draft" && !editing && (
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
        <span>作成日: {formatDateTime(plan.createdAt)}</span>
        <span>計画期間: {plan.planStartDate} 〜 {plan.nextReviewDate}</span>
        {plan.confirmedAt && <span>確定日: {formatDateTime(plan.confirmedAt)}</span>}
      </div>

      <div className="support-plan-section">
        <h4>全体的な支援方針</h4>
        {editData ? (
          <textarea
            className="support-plan-textarea"
            value={editData.overallPolicy}
            onChange={(e) => setEditData({ ...editData, overallPolicy: e.target.value })}
          />
        ) : (
          <p className="support-plan-text">{plan.overallPolicy}</p>
        )}
      </div>

      <div className="support-plan-section">
        <h4>支援目標・内容</h4>
        {(editData ? editData.goals : plan.goals).map((goal, i) => (
          <div key={i} className="support-plan-goal">
            <div className="goal-area-badge">{goal.area}</div>
            <div className="goal-grid">
              <div>
                <div className="goal-label">長期目標（6ヶ月〜1年）</div>
                {editData ? (
                  <textarea
                    className="support-plan-input"
                    value={editData.goals[i].longTermGoal}
                    onChange={(e) => updateGoal(i, { longTermGoal: e.target.value })}
                  />
                ) : (
                  <p>{goal.longTermGoal}</p>
                )}
              </div>
              <div>
                <div className="goal-label">短期目標（3ヶ月）</div>
                {editData ? (
                  <textarea
                    className="support-plan-input"
                    value={editData.goals[i].shortTermGoal}
                    onChange={(e) => updateGoal(i, { shortTermGoal: e.target.value })}
                  />
                ) : (
                  <p>{goal.shortTermGoal}</p>
                )}
              </div>
            </div>
            <div className="goal-supports">
              <div className="goal-label">具体的な支援内容</div>
              <ul>
                {goal.supports.map((s, j) => (
                  <li key={j}>
                    {editData ? (
                      <input
                        className="support-plan-input-inline"
                        value={editData.goals[i].supports[j]}
                        onChange={(e) => {
                          const supports = [...editData.goals[i].supports];
                          supports[j] = e.target.value;
                          updateGoal(i, { supports });
                        }}
                      />
                    ) : (
                      s
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="goal-meta">
              <span>頻度: {goal.frequency}</span>
              <span>担当: {goal.responsible}</span>
            </div>
          </div>
        ))}
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
          <p className="support-plan-text">{plan.specialNotes || "（なし）"}</p>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function NewCaseModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    clientName: "",
    clientId: "",
    dateOfBirth: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValid = form.clientName && form.clientId && form.dateOfBirth;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError("");
    try {
      await api.createCase(form);
      onCreated();
    } catch (err) {
      setError(`作成に失敗しました: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const missingFields: string[] = [];
  if (!form.clientName) missingFields.push("相談者氏名");
  if (!form.clientId) missingFields.push("相談者ID");
  if (!form.dateOfBirth) missingFields.push("生年月日");

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-case-title" onClick={onClose} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="new-case-title">新規ケース作成</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="clientName">相談者氏名 *</label>
            <input
              id="clientName"
              className="form-input"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="例: 山田 太郎"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="clientId">相談者ID（住基番号・通所者番号等） *</label>
            <input
              id="clientId"
              className="form-input"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              placeholder="例: C-00123"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dateOfBirth">生年月日 *</label>
            <input
              id="dateOfBirth"
              className="form-input"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staffEmail">担当職員</label>
            <input id="staffEmail" className="form-input" value={user?.email ?? ""} disabled />
            <p className="form-help">ログイン中の職員が自動で割り当てられます</p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>キャンセル</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting ? "作成中..." : "ケースを作成"}
          </button>
          {!isValid && (
            <p className="form-help">未入力の項目: {missingFields.join("、")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

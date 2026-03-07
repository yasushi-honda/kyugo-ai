import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function NewCaseModal({ onClose, onCreated }: Props) {
  const { user, userInfo } = useAuth();
  const [form, setForm] = useState({
    clientName: "",
    clientId: "",
    dateOfBirth: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.clientName || !form.clientId || !form.dateOfBirth) return;
    setSubmitting(true);
    try {
      await api.createCase({ ...form, assignedStaffId: userInfo?.staffId ?? "" });
      onCreated();
    } catch (err) {
      alert(`作成に失敗しました: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新規ケース作成</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">相談者氏名 *</label>
            <input
              className="form-input"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="例: 山田 太郎"
            />
          </div>
          <div className="form-group">
            <label className="form-label">相談者ID *</label>
            <input
              className="form-input"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              placeholder="例: client-001"
            />
          </div>
          <div className="form-group">
            <label className="form-label">生年月日 *</label>
            <input
              className="form-input"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">担当職員</label>
            <input className="form-input" value={user?.email ?? ""} disabled />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>キャンセル</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !form.clientName || !form.clientId || !form.dateOfBirth}
          >
            {submitting ? "作成中..." : "ケースを作成"}
          </button>
        </div>
      </div>
    </div>
  );
}

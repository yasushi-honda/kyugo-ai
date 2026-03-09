import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api";
import type { StaffDetail } from "../api";
import { useAuth } from "../contexts/AuthContext";

function useSuccessMessage(durationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), durationMs);
  }, [durationMs]);
  return { message, show };
}

type SettingsTab = "whitelist" | "accounts";

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("whitelist");

  return (
    <>
      <div className="page-header">
        <h1>アクセス設定</h1>
        <p className="page-header-subtitle">ログイン許可リストとアカウントの管理</p>
      </div>
      <div className="page-body">
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === "whitelist" ? "active" : ""}`}
            onClick={() => setActiveTab("whitelist")}
          >
            ログイン許可
          </button>
          <button
            className={`settings-tab ${activeTab === "accounts" ? "active" : ""}`}
            onClick={() => setActiveTab("accounts")}
          >
            アカウント管理
          </button>
        </div>
        {activeTab === "whitelist" ? <WhitelistSettings /> : <AccountSettings />}
      </div>
    </>
  );
}

function WhitelistSettings() {
  const [emails, setEmails] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { message: successMessage, show: showSuccess } = useSuccessMessage();

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllowedEmails();
      setEmails(data.emails);
      setDomains(data.domains);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.updateAllowedEmails({ emails, domains });
      setEmails(result.emails);
      setDomains(result.domains);
      showSuccess("保存しました");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (emails.includes(trimmed)) {
      setError("このメールアドレスは既に登録されています");
      return;
    }
    setEmails([...emails, trimmed]);
    setNewEmail("");
    setError(null);
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const addDomain = () => {
    const trimmed = newDomain.trim().toLowerCase().replace(/^@/, "");
    if (!trimmed) return;
    if (domains.includes(trimmed)) {
      setError("このドメインは既に登録されています");
      return;
    }
    setDomains([...domains, trimmed]);
    setNewDomain("");
    setError(null);
  };

  const removeDomain = (domain: string) => {
    setDomains(domains.filter((d) => d !== domain));
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>読み込み中...</span>
      </div>
    );
  }

  return (
    <>
      {error && <div className="alert-error">{error}</div>}
      {successMessage && <div className="alert-success">{successMessage}</div>}

      <div className="settings-layout">
        <div className="card settings-card">
          <div className="card-body">
            <h4 className="settings-card-title">
              <span className="settings-icon">✉</span>
              許可メールアドレス
            </h4>
            <p className="settings-card-desc">
              個別のメールアドレスを指定してログインを許可します
            </p>
            <div className="settings-input-row">
              <input
                type="email"
                className="settings-input"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addEmail(); }}
              />
              <button className="btn btn-primary settings-add-btn" onClick={addEmail}>追加</button>
            </div>
            <div className="settings-tag-list">
              {emails.length === 0 ? (
                <p className="settings-empty">登録されたメールアドレスはありません</p>
              ) : (
                emails.map((email) => (
                  <span key={email} className="settings-tag settings-tag-email">
                    {email}
                    <button className="settings-tag-remove" onClick={() => removeEmail(email)} aria-label={`${email}を削除`}>×</button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="card settings-card">
          <div className="card-body">
            <h4 className="settings-card-title">
              <span className="settings-icon">🌐</span>
              許可ドメイン
            </h4>
            <p className="settings-card-desc">
              指定ドメインのメールアドレスを持つユーザー全員にログインを許可します
            </p>
            <div className="settings-input-row">
              <input
                type="text"
                className="settings-input"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addDomain(); }}
              />
              <button className="btn btn-primary settings-add-btn" onClick={addDomain}>追加</button>
            </div>
            <div className="settings-tag-list">
              {domains.length === 0 ? (
                <p className="settings-empty">登録されたドメインはありません</p>
              ) : (
                domains.map((domain) => (
                  <span key={domain} className="settings-tag settings-tag-domain">
                    @{domain}
                    <button className="settings-tag-remove" onClick={() => removeDomain(domain)} aria-label={`${domain}を削除`}>×</button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-save-bar">
        <button
          className="btn btn-accent settings-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </div>
    </>
  );
}

const ROLE_LABELS: Record<string, string> = { admin: "管理者", staff: "職員" };

function AccountSettings() {
  const { userInfo } = useAuth();
  const [staffList, setStaffList] = useState<StaffDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { message: successMessage, show: showSuccess } = useSuccessMessage();
  const [updating, setUpdating] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAdminStaff();
      setStaffList(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleRoleChange = async (staff: StaffDetail, newRole: "admin" | "staff") => {
    if (staff.role === newRole) return;
    setUpdating(staff.id);
    setError(null);
    try {
      const updated = await api.updateStaff(staff.id, { role: newRole });
      setStaffList((prev) => prev.map((s) => (s.id === staff.id ? updated : s)));
      showSuccess(`${staff.name || staff.email} のロールを${ROLE_LABELS[newRole]}に変更しました`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleDisabled = async (staff: StaffDetail) => {
    setUpdating(staff.id);
    setError(null);
    try {
      const updated = await api.updateStaff(staff.id, { disabled: !staff.disabled });
      setStaffList((prev) => prev.map((s) => (s.id === staff.id ? updated : s)));
      showSuccess(`${staff.name || staff.email} を${updated.disabled ? "無効化" : "有効化"}しました`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>読み込み中...</span>
      </div>
    );
  }

  return (
    <>
      {error && <div className="alert-error">{error}</div>}
      {successMessage && <div className="alert-success">{successMessage}</div>}

      <div className="card">
        <div className="card-body">
          <h4 className="settings-card-title">
            <span className="settings-icon">👥</span>
            アカウント一覧
          </h4>
          <p className="settings-card-desc">
            登録済み職員のロール変更・アカウント無効化を管理します
          </p>

          {staffList.length === 0 ? (
            <p className="settings-empty">登録された職員はいません</p>
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>名前</th>
                  <th>メールアドレス</th>
                  <th>ロール</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => {
                  const isSelf = staff.id === userInfo?.staffId;
                  const isUpdating = updating === staff.id;
                  return (
                    <tr key={staff.id} className={staff.disabled ? "staff-row-disabled" : ""}>
                      <td>
                        {staff.name || "—"}
                        {isSelf && <span className="badge-self">自分</span>}
                      </td>
                      <td>{staff.email || "—"}</td>
                      <td>
                        <select
                          className="staff-role-select"
                          value={staff.role}
                          onChange={(e) => handleRoleChange(staff, e.target.value as "admin" | "staff")}
                          disabled={isSelf || isUpdating}
                        >
                          <option value="admin">管理者</option>
                          <option value="staff">職員</option>
                        </select>
                      </td>
                      <td>
                        <span className={`badge-status ${staff.disabled ? "badge-disabled" : "badge-active"}`}>
                          {staff.disabled ? "無効" : "有効"}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${staff.disabled ? "btn-enable" : "btn-disable"}`}
                          onClick={() => handleToggleDisabled(staff)}
                          disabled={isSelf || isUpdating}
                        >
                          {isUpdating ? "..." : staff.disabled ? "有効化" : "無効化"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

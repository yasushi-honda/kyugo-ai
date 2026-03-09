import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api";

export function Settings() {
  const [emails, setEmails] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

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
    setSuccessMessage(null);
    try {
      const result = await api.updateAllowedEmails({ emails, domains });
      setEmails(result.emails);
      setDomains(result.domains);
      setSuccessMessage("保存しました");
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), 3000);
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
      <div className="page-header">
        <h1>アクセス設定</h1>
        <p className="page-header-subtitle">ログイン許可リストの管理</p>
      </div>
      <div className="page-body">
        {error && <div className="alert-error">{error}</div>}
        {successMessage && <div className="alert-success">{successMessage}</div>}

        <div className="settings-layout">
          {/* Allowed Emails */}
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

          {/* Allowed Domains */}
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
      </div>
    </>
  );
}

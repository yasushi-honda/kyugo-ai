import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";

const googleProvider = new GoogleAuthProvider();

function getErrorMessage(err: Error): string {
  const msg = err.message;
  if (msg.includes("popup-closed-by-user")) {
    return "ログインウィンドウが閉じられました。もう一度お試しください。";
  }
  if (msg.includes("popup-blocked")) {
    return "ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。";
  }
  if (msg.includes("network-request-failed")) {
    return "インターネット接続を確認してください。接続後にもう一度お試しください。";
  }
  if (msg.includes("unauthorized-domain")) {
    return "このドメインからのログインは許可されていません。管理者にお問い合わせください。";
  }
  return "ログインに失敗しました。繰り返し発生する場合は管理者にお問い合わせください。";
}

export function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(getErrorMessage(err as Error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="card-body">
          <div className="login-brand">
            <div className="login-brand-icon">救</div>
            <h1 className="login-title">救護AI</h1>
            <p className="login-subtitle">福祉相談業務AI支援システム</p>
          </div>

          <div className="login-divider">ログイン</div>

          <p className="login-guidance">
            組織のGoogleアカウントでログインしてください。
            初回ログインやトラブル時は管理者にお問い合わせください。
          </p>

          {error && <div className="login-error">{error}</div>}

          <button
            type="button"
            className="btn btn-primary login-btn google-login-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? "ログイン中..." : "Googleアカウントでログイン"}
          </button>
        </div>
      </div>
    </div>
  );
}

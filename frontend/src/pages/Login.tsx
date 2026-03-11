import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";

const googleProvider = new GoogleAuthProvider();

function classifyError(err: Error): { message: string; isHint: boolean } {
  const msg = err.message;
  if (msg.includes("popup-closed-by-user")) {
    return { message: "ログインウィンドウが閉じられました。もう一度お試しください。", isHint: true };
  }
  if (msg.includes("popup-blocked")) {
    return { message: "ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。", isHint: false };
  }
  if (msg.includes("network-request-failed")) {
    return { message: "インターネット接続を確認してください。接続後にもう一度お試しください。", isHint: false };
  }
  if (msg.includes("unauthorized-domain")) {
    return { message: "このドメインからのログインは許可されていません。管理者にお問い合わせください。", isHint: false };
  }
  return { message: "ログインに失敗しました。繰り返し発生する場合は管理者にお問い合わせください。", isHint: false };
}

export function Login() {
  const [error, setError] = useState("");
  const [isHint, setIsHint] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setIsHint(false);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const classified = classifyError(err as Error);
      setError(classified.message);
      setIsHint(classified.isHint);
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

          {error && <div className={isHint ? "login-hint" : "login-error"}>{error}</div>}

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

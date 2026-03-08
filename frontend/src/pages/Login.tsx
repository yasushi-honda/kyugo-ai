import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";

const googleProvider = new GoogleAuthProvider();

export function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes("popup-closed-by-user")) {
        setLoading(false);
        return;
      }
      setError("ログインに失敗しました");
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

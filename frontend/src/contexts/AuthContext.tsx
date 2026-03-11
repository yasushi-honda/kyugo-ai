import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import { api, type UserInfo } from "../api";

interface AuthContextType {
  user: User | null;
  userInfo: UserInfo | null;
  loading: boolean;
  retrying: boolean;
  authError: string | null;
  logoutError: string | null;
  logout: () => Promise<void>;
  forceLogout: () => void;
  retryGetMe: () => Promise<void>;
  getIdToken: () => Promise<string>;
}

function getAuthErrorMessage(message: string): string {
  if (message.includes("email domain not allowed")) {
    return "このメールアドレスのドメインは許可されていません。組織のアカウントでログインしてください。";
  }
  if (message.includes("has been disabled")) {
    return "このアカウントは無効化されています。管理者にお問い合わせください。";
  }
  if (message.includes("Email is required")) {
    return "メールアドレスが取得できません。Googleアカウントの設定を確認してください。";
  }
  if (message.includes("Email not verified")) {
    return "メールアドレスが未確認です。Googleアカウントのメール確認を完了してください。";
  }
  return `職員情報の取得に失敗しました: ${message}`;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchMe = async (isRetry = false) => {
    const requestId = ++fetchIdRef.current;
    setAuthError(null);
    if (isRetry) {
      setRetrying(true);
    } else {
      setLoading(true);
    }
    try {
      const info = await api.getMe();
      if (requestId !== fetchIdRef.current) return;
      setUserInfo(info);
    } catch (err) {
      if (requestId !== fetchIdRef.current) return;
      setUserInfo(null);
      setAuthError(getAuthErrorMessage((err as Error).message));
    } finally {
      if (requestId === fetchIdRef.current) {
        if (isRetry) {
          setRetrying(false);
        } else {
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    const ref = fetchIdRef;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthError(null);
      setLogoutError(null);
      if (u) {
        await fetchMe();
      } else {
        ref.current++;
        setUserInfo(null);
        setLoading(false);
      }
    });
    return () => {
      unsubscribe();
      ref.current++;
    };
  }, []);

  const logout = async () => {
    setLogoutError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setLogoutError(`ログアウトに失敗しました: ${(err as Error).message}`);
    }
  };

  const forceLogout = () => {
    setUser(null);
    setUserInfo(null);
    setAuthError(null);
    setLogoutError(null);
    signOut(auth).catch(() => {});
  };

  const retryGetMe = async () => {
    if (!user || retrying) return;
    await fetchMe(true);
  };

  const getIdToken = async () => {
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, userInfo, loading, retrying, authError, logoutError, logout, forceLogout, retryGetMe, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

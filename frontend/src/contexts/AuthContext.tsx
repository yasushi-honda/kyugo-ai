import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import { api, type UserInfo } from "../api";

interface AuthContextType {
  user: User | null;
  userInfo: UserInfo | null;
  loading: boolean;
  authError: string | null;
  logoutError: string | null;
  logout: () => Promise<void>;
  forceLogout: () => void;
  retryGetMe: () => Promise<void>;
  getIdToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const fetchMe = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const info = await api.getMe();
      setUserInfo(info);
    } catch (err) {
      setUserInfo(null);
      setAuthError(`職員情報の取得に失敗しました: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthError(null);
      setLogoutError(null);
      if (u) {
        await fetchMe();
      } else {
        setUserInfo(null);
        setLoading(false);
      }
    });
    return unsubscribe;
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
  };

  const retryGetMe = async () => {
    if (!user) return;
    await fetchMe();
  };

  const getIdToken = async () => {
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, userInfo, loading, authError, logoutError, logout, forceLogout, retryGetMe, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

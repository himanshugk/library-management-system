import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "@/services/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("lms_user");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("lms_token"),
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem("lms_token")) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
      localStorage.setItem("lms_user", JSON.stringify(me));
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem("lms_token");
      localStorage.removeItem("lms_user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    localStorage.setItem("lms_token", res.access_token);
    localStorage.setItem("lms_user", JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore - token is client-side anyway
    }
    localStorage.removeItem("lms_token");
    localStorage.removeItem("lms_user");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refresh,
      isAdmin: user?.role === "ADMIN",
    }),
    [user, token, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

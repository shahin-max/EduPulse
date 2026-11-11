"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, authApi, type AuthTokens, type LoginInput, type RegisterInput, type User } from "@/lib/api";

type Session = { accessToken: string; refreshToken: string };
type Status = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: User | null;
  status: Status;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  /** Runs an authenticated call, refreshing the access token once if it has expired. */
  withToken: <T>(call: (accessToken: string) => Promise<T>) => Promise<T>;
};

const STORAGE_KEY = "edupulse-session";
const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.accessToken && parsed?.refreshToken ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const session = useRef<Session | null>(null);
  // The API rotates refresh tokens, so concurrent refreshes must share one request.
  const refreshing = useRef<Promise<Session> | null>(null);

  const apply = useCallback((tokens: AuthTokens | null) => {
    session.current = tokens ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } : null;
    writeSession(session.current);
    setUser(tokens?.user ?? null);
    setStatus(tokens ? "authenticated" : "anonymous");
  }, []);

  const refresh = useCallback(async (): Promise<Session> => {
    const current = session.current;
    if (!current) throw new ApiError(401, "Please log in again.");
    refreshing.current ??= authApi.refresh(current.refreshToken)
      .then(tokens => { apply(tokens); return session.current!; })
      .catch(error => { apply(null); throw error; })
      .finally(() => { refreshing.current = null; });
    return refreshing.current;
  }, [apply]);

  const withToken = useCallback(async <T,>(call: (accessToken: string) => Promise<T>): Promise<T> => {
    if (!session.current) throw new ApiError(401, "Please log in.");
    try {
      return await call(session.current.accessToken);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const next = await refresh();
      return call(next.accessToken);
    }
  }, [refresh]);

  // Restore the session saved by a previous visit.
  useEffect(() => {
    session.current = readSession();
    if (!session.current) { setStatus("anonymous"); return; }
    withToken(authApi.me)
      .then(me => { setUser(me); setStatus("authenticated"); })
      .catch(() => apply(null));
  }, [withToken, apply]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    withToken,
    login: async input => { const tokens = await authApi.login(input); apply(tokens); return tokens.user; },
    register: async input => { const tokens = await authApi.register(input); apply(tokens); return tokens.user; },
    logout: async () => {
      const token = session.current?.accessToken;
      apply(null);
      if (token) await authApi.logout(token).catch(() => {});
    },
  }), [user, status, withToken, apply]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

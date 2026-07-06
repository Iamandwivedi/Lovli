// Auth context — holds session state, token persisted in expo-secure-store.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authLogin, authMe, authSignup, User } from "@/src/api/endpoints";
import { loadAuthToken, setAuthToken, setUnauthorizedHandler } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { ASK_PENDING_KEY, ASK_THREAD_KEY } from "@/src/config/storage-keys";

type Status = "checking" | "authed" | "unauthed";

type AuthContextValue = {
  user: User | null;
  status: Status;
  isAuthed: boolean;
  isChecking: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<User | null>;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("checking");

  const refreshMe = useCallback(async (): Promise<User | null> => {
    try {
      const token = await loadAuthToken();
      if (!token) {
        setUser(null);
        setStatus("unauthed");
        return null;
      }
      const me = await authMe();
      setUser(me);
      setStatus("authed");
      return me;
    } catch {
      await setAuthToken(null);
      setUser(null);
      setStatus("unauthed");
      return null;
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("unauthed");
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, user: u } = await authLogin(email, password);
    await setAuthToken(access_token);
    setUser(u);
    setStatus("authed");
    return u;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { access_token, user: u } = await authSignup(name, email, password);
    await setAuthToken(access_token);
    setUser(u);
    setStatus("authed");
    return u;
  }, []);

  const logout = useCallback(async () => {
    await setAuthToken(null);
    // Personal local data must not leak across accounts (PR-V2-4 carry-in fix).
    await storage.removeItem(ASK_THREAD_KEY);
    await storage.removeItem(ASK_PENDING_KEY);
    setUser(null);
    setStatus("unauthed");
  }, []);

  const updateUser = useCallback((u: User) => setUser(u), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthed: status === "authed",
      isChecking: status === "checking",
      login,
      signup,
      logout,
      refreshMe,
      updateUser,
    }),
    [user, status, login, signup, logout, refreshMe, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

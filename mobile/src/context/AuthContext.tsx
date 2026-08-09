// Auth context — holds session state, token persisted in expo-secure-store.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Bootstrap,
  authLogin,
  authMe,
  authSignup,
  authTestLogin,
  getBootstrap,
  User,
} from "@/src/api/endpoints";
import { loadAuthToken, setAuthToken, setUnauthorizedHandler } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { ASK_PENDING_KEY, ASK_THREAD_KEY, PREFS_KEY, GOAL_KEY } from "@/src/config/storage-keys";
import { cancelAllNotifications, resyncNotificationsFromStorage } from "@/src/utils/notifications";
import { hydrateFromCloud } from "@/src/lib/user-prefs";

type Status = "checking" | "authed" | "unauthed";

type AuthContextValue = {
  user: User | null;
  status: Status;
  isAuthed: boolean;
  isChecking: boolean;
  /** Account state restored from the cloud at sign-in (null until it lands). */
  bootstrap: Bootstrap | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<User | null>;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Dev-only auto sign-in: needs BOTH the env flag and a dev build (__DEV__ is
// false in release builds, so this can never ship to production).
const DEV_AUTO_LOGIN = __DEV__ && process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN === "true";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("checking");
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);

  /**
   * Pull the account's cloud state and replay it onto the device.
   *
   * This is what makes a reinstall or a new phone look like the old one:
   * preferences, the onboarding goal, and the Ask Lovli thread all live on the
   * server keyed to the account. Best-effort — a failure here must never block
   * sign-in, since the app still works from whatever is cached locally.
   */
  const hydrateFromAccount = useCallback(async (): Promise<Bootstrap | null> => {
    try {
      const data = await getBootstrap();
      setBootstrap(data);
      setUser(data.user);
      await hydrateFromCloud(data.preferences);
      if (data.ask_thread?.length) {
        // The chat screen stores {id, role, text}; the wire format carries only
        // {role, text}, so mint the ids it uses as React keys.
        const restored = data.ask_thread.map((turn, i) => ({
          id: `restored-${i}-${turn.role}`,
          role: turn.role,
          text: turn.text,
        }));
        await storage.setItem(ASK_THREAD_KEY, JSON.stringify(restored)).catch(() => {});
      }
      // Reminder schedules follow the restored preferences.
      resyncNotificationsFromStorage();
      return data;
    } catch {
      return null;
    }
  }, []);

  const tryDevAutoLogin = useCallback(async (): Promise<User | null> => {
    try {
      const { access_token, user: u } = await authTestLogin();
      await setAuthToken(access_token);
      setUser(u);
      setStatus("authed");
      return u;
    } catch {
      // Backend gate is off or unreachable — fall back to the normal login screen.
      return null;
    }
  }, []);

  const refreshMe = useCallback(async (): Promise<User | null> => {
    try {
      const token = await loadAuthToken();
      if (!token) {
        if (DEV_AUTO_LOGIN) {
          const devUser = await tryDevAutoLogin();
          if (devUser) return devUser;
        }
        setUser(null);
        setStatus("unauthed");
        return null;
      }
      const me = await authMe();
      setUser(me);
      setStatus("authed");
      hydrateFromAccount();
      return me;
    } catch {
      await setAuthToken(null);
      setUser(null);
      setStatus("unauthed");
      return null;
    }
  }, [tryDevAutoLogin]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("unauthed");
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token, user: u } = await authLogin(email, password);
      await setAuthToken(access_token);
      setUser(u);
      setStatus("authed");
      // Signing in on a new device restores everything from the account.
      await hydrateFromAccount();
      return u;
    },
    [hydrateFromAccount],
  );

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
    // The cloud copies stay put — signing back in restores them.
    await storage.removeItem(ASK_THREAD_KEY);
    await storage.removeItem(ASK_PENDING_KEY);
    await storage.removeItem(PREFS_KEY);
    await storage.removeItem(GOAL_KEY);
    await cancelAllNotifications();
    setBootstrap(null);
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
      bootstrap,
      login,
      signup,
      logout,
      refreshMe,
      updateUser,
    }),
    [user, status, bootstrap, login, signup, logout, refreshMe, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

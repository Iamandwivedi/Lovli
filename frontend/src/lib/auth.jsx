import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '@/lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  // null = checking, false = not authed, true = authed
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(getToken() ? 'checking' : 'unauthed');

  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setStatus('unauthed');
      return null;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      setStatus('authed');
      return data;
    } catch {
      setToken(null);
      setUser(null);
      setStatus('unauthed');
      return null;
    }
  }, []);

  useEffect(() => {
    // CRITICAL: skip me-check if returning from OAuth (AuthCallback handles it)
    if (typeof window !== 'undefined' && window.location.hash?.includes('session_id=')) {
      setStatus((s) => (s === 'checking' ? 'unauthed' : s));
      return;
    }
    refreshMe();
  }, [refreshMe]);

  const loginWithEmail = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.access_token);
    setUser(data.user);
    setStatus('authed');
    return data.user;
  }, []);

  const signupWithEmail = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    setToken(data.access_token);
    setUser(data.user);
    setStatus('authed');
    return data.user;
  }, []);

  const exchangeGoogleSession = useCallback(async (sessionId) => {
    const { data } = await api.post('/auth/google/session', { session_id: sessionId });
    setToken(data.access_token);
    setUser(data.user);
    setStatus('authed');
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus('unauthed');
  }, []);

  const updateUser = useCallback((u) => setUser(u), []);

  const value = {
    user,
    status,
    isAuthed: status === 'authed',
    isChecking: status === 'checking',
    loginWithEmail,
    signupWithEmail,
    exchangeGoogleSession,
    logout,
    refreshMe,
    updateUser,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

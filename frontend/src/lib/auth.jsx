import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '@/lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
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

  // Standard Google OAuth code exchange. Replaces the legacy Emergent session flow.
  const exchangeGoogleCode = useCallback(async ({ code, redirect_uri, state }) => {
    const { data } = await api.post('/auth/google/code', {
      code,
      redirect_uri,
      state,
    });
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
    exchangeGoogleCode,
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

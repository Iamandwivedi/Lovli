import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/auth';
import { getMe, logout as apiLogout } from '@/services/authApi';
import { getToken } from '@/lib/storage';

interface AuthState {
  user: User | null;
  loading: boolean;
  token: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, token: null });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const token = await getToken();
    if (!token) {
      setState({ user: null, loading: false, token: null });
      return;
    }
    try {
      const user = await getMe();
      setState({ user, loading: false, token });
    } catch {
      setState({ user: null, loading: false, token: null });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const logout = useCallback(async () => {
    await apiLogout();
    setState({ user: null, loading: false, token: null });
  }, []);

  const refresh = useCallback(async () => {
    const user = await getMe();
    setState(s => ({ ...s, user }));
  }, []);

  return { ...state, logout, refresh, reload: load };
}

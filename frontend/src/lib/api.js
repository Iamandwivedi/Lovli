import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

export const TOKEN_KEY = 'lovli_jwt';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      setToken(null);
      // Don't auto-redirect from auth endpoints themselves
      const url = err.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/signup')) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup') && !window.location.pathname.startsWith('/auth')) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(err);
  }
);

export function getLocalDateString() {
  // YYYY-MM-DD in user's local timezone
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

/**
 * Safely turn any error from an `api.*` call into a single human-readable
 * string. FastAPI returns `detail` as a string for HTTPException but as an
 * ARRAY of Pydantic error objects on 422 validation errors. Passing those
 * objects directly to `toast.error` (or any React child) crashes the
 * render tree, so every catch handler should use this helper.
 *
 * Usage:
 *   try { ... } catch (err) { toast.error(extractErrorMessage(err, 'fallback')); }
 */
export function extractErrorMessage(err, fallback = 'Something went wrong. Try again.') {
  try {
    const d = err?.response?.data?.detail;
    if (typeof d === 'string' && d.trim()) return d;
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0];
      if (typeof first === 'string') return first;
      if (first && typeof first.msg === 'string') return first.msg;
    }
    if (d && typeof d === 'object' && typeof d.msg === 'string') return d.msg;
    if (typeof err?.message === 'string' && err.message && err.message !== 'Network Error') {
      return err.message;
    }
  } catch {
    /* fall through to fallback */
  }
  return fallback;
}


// Axios client for the live Lovli backend. Token is injected via interceptor.
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { storage } from "@/src/utils/storage";

// Production API. The fallback matters: a release/EAS build without the env var
// injected must still reach the API, and app.lovli.in is the web app — it would
// answer with the SPA's HTML instead of JSON and fail in a confusing way.
const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://api.lovli.in";
export const TOKEN_KEY = "lovli_access_token";

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 60000,
});

let inMemoryToken: string | null = null;

export const setAuthToken = async (token: string | null) => {
  inMemoryToken = token;
  if (token) {
    await storage.secureSet(TOKEN_KEY, token);
  } else {
    await storage.secureRemove(TOKEN_KEY);
  }
};

export const loadAuthToken = async (): Promise<string | null> => {
  if (inMemoryToken) return inMemoryToken;
  const stored = await storage.secureGet<string>(TOKEN_KEY, "");
  inMemoryToken = stored && stored.length > 0 ? stored : null;
  return inMemoryToken;
};

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await loadAuthToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/signup")) {
      inMemoryToken = null;
      storage.secureRemove(TOKEN_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export const extractErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as AxiosError<{ detail?: unknown }>;
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.length > 0) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }
  return fallback;
};

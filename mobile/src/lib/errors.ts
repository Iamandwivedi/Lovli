// Ported from frontend/src/lib/api.js — handles both string and array detail shapes
export function extractErrorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  try {
    const anyErr = err as Record<string, unknown>;
    const response = anyErr?.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    const d = data?.detail;

    if (typeof d === 'string' && d.trim()) return d;
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0];
      if (typeof first === 'string') return first;
      if (first && typeof (first as Record<string, unknown>).msg === 'string') {
        return (first as Record<string, unknown>).msg as string;
      }
    }
    if (d && typeof d === 'object' && typeof (d as Record<string, unknown>).msg === 'string') {
      return (d as Record<string, unknown>).msg as string;
    }
    const message = anyErr?.message;
    if (typeof message === 'string' && message && message !== 'Network Error') {
      return message;
    }
  } catch {
    // fall through
  }
  return fallback;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isLimitReached = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

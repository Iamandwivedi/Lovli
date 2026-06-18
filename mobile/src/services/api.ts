import { BACKEND_URL } from '@/constants/api';
import { getToken } from '@/lib/storage';
import { extractErrorMessage, ApiError } from '@/lib/errors';

async function buildHeaders(includeAuth = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (includeAuth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, ...fetchOptions } = options;
  const headers = await buildHeaders(auth);

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...fetchOptions,
    headers: {
      ...headers,
      ...(fetchOptions.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = null; }
    const msg = extractErrorMessage({ response: { data: body } });
    throw new ApiError(msg, res.status, res.status === 429);
  }

  return res.json() as Promise<T>;
}

// Multipart helper for image upload
export async function apiMultipart<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = null; }
    const msg = extractErrorMessage({ response: { data: body } });
    throw new ApiError(msg, res.status, res.status === 429);
  }

  return res.json() as Promise<T>;
}

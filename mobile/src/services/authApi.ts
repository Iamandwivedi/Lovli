import { apiFetch } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { AuthResponse, LoginPayload, SignupPayload, User } from '@/types/auth';
import { saveToken, deleteToken } from '@/lib/storage';

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>(API_ENDPOINTS.signup, {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  });
  await saveToken(res.access_token);
  return res;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>(API_ENDPOINTS.login, {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  });
  await saveToken(res.access_token);
  return res;
}

export async function getMe(): Promise<User> {
  return apiFetch<User>(API_ENDPOINTS.me);
}

export async function logout(): Promise<void> {
  await deleteToken();
}

export async function patchOnboarding(preferences: Partial<User>): Promise<User> {
  return apiFetch<User>(API_ENDPOINTS.onboarding, {
    method: 'PATCH',
    body: JSON.stringify(preferences),
  });
}

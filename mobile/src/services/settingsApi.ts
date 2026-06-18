import { apiFetch } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { User } from '@/types/auth';

export interface SettingsPayload {
  name?: string;
  preferred_platform?: string;
  language_preference?: string;
  timezone?: string;
}

export async function updateSettings(payload: SettingsPayload): Promise<User> {
  return apiFetch<User>(API_ENDPOINTS.settings, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

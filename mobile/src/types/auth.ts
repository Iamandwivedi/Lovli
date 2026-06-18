export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  preferred_platform?: string;
  language_preference?: string;
  timezone?: string;
  onboarding_completed?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  // Backend (and web app) return `access_token`, not `token`.
  access_token: string;
  user: User;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

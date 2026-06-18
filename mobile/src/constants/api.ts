export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.lovli.in';

export const API_ENDPOINTS = {
  signup: '/api/auth/signup',
  login: '/api/auth/login',
  me: '/api/auth/me',
  googleConfig: '/api/auth/google/config',
  googleCode: '/api/auth/google/code',
  onboarding: '/api/auth/onboarding',
  generateReplies: '/api/generate-replies',
  feedback: '/api/feedback',
  usage: '/api/usage',
  memoryCards: '/api/memory-cards',
  waitlist: '/api/waitlist',
  settings: '/api/settings',
} as const;

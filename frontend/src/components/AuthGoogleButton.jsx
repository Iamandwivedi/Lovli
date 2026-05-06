// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
import React from 'react';
import { Button } from '@/components/ui/button';

export default function AuthGoogleButton({ children = 'Continue with Google', testId = 'login-google-button' }) {
  const onClick = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      data-testid={testId}
      className="w-full min-h-[44px] rounded-xl border border-white/12 bg-white/[0.06] text-white/90 hover:bg-white/[0.08]"
    >
      <span className="inline-flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13 4.5 4 13.5 4 24.5s9 20 20 20 20-9 20-20c0-1.4-.1-2.7-.4-4z"/>
          <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.6 15.1 18.9 12.5 24 12.5c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.6 8.4 6.3 14.1z"/>
          <path fill="#4CAF50" d="M24 44.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.1 0-9.5-3.4-11.1-8.1l-6.5 5C9.4 40.5 16.1 44.5 24 44.5z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.3 0-1.4-.1-2.7-.4-4z"/>
        </svg>
        {children}
      </span>
    </Button>
  );
}

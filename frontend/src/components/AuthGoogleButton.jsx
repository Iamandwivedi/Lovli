// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Standard Google OAuth 2.0 "authorization-code" flow.
 *
 * 1. Fetch /api/auth/google/config to get the public client_id (and whether enabled).
 * 2. Build https://accounts.google.com/o/oauth2/v2/auth URL with our client_id +
 *    redirect_uri (current origin + /auth) + response_type=code + scope=openid email profile.
 * 3. Save a CSRF "state" to sessionStorage and pass it to Google.
 * 4. Browser redirects to Google -> back to /auth?code=...&state=...
 * 5. AuthCallback validates state and exchanges the code via /api/auth/google/code.
 */
export default function AuthGoogleButton({
  children = 'Continue with Google',
  testId = 'login-google-button',
}) {
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/google/config');
        if (mounted) setConfig(data);
      } catch {
        if (mounted) setConfig({ enabled: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onClick = async () => {
    if (busy) return;
    if (!config) {
      toast.error('Loading… try again in a sec.');
      return;
    }
    if (!config.enabled || !config.client_id) {
      toast.error('Google sign-in is not yet configured.');
      return;
    }

    setBusy(true);
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUri = window.location.origin + '/auth';

    // Generate a CSRF state nonce.
    const arr = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    const state = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    try {
      sessionStorage.setItem('lovli_oauth_state', state);
      sessionStorage.setItem('lovli_oauth_redirect_uri', redirectUri);
    } catch {
      /* ignore */
    }

    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scope || 'openid email profile',
      include_granted_scopes: 'true',
      access_type: 'online',
      prompt: 'select_account',
      state,
    });

    window.location.href =
      'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  };

  const disabled = !config?.enabled || busy;

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="w-full min-h-[44px] rounded-full border border-lovli-border bg-lovli-card text-lovli-text hover:bg-lovli-card-2 hover:border-lovli-border-strong disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      title={
        config && !config.enabled
          ? 'Google sign-in will be enabled once credentials are added.'
          : undefined
      }
    >
      <span className="inline-flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13 4.5 4 13.5 4 24.5s9 20 20 20 20-9 20-20c0-1.4-.1-2.7-.4-4z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.1l6.6 4.8C14.6 15.1 18.9 12.5 24 12.5c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.6 8.4 6.3 14.1z"
          />
          <path
            fill="#4CAF50"
            d="M24 44.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.1 0-9.5-3.4-11.1-8.1l-6.5 5C9.4 40.5 16.1 44.5 24 44.5z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.3 0-1.4-.1-2.7-.4-4z"
          />
        </svg>
        {config && !config.enabled ? 'Google sign-in (coming soon)' : children}
      </span>
    </Button>
  );
}

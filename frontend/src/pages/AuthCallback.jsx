import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import LoadingState from '@/components/LoadingState';
import { toast } from 'sonner';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { exchangeGoogleCode } = useAuth();
  const [params] = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const errorParam = params.get('error');

    if (errorParam) {
      toast.error(
        errorParam === 'access_denied'
          ? 'Sign-in cancelled.'
          : 'Sign-in failed. Try again.'
      );
      navigate('/login', { replace: true });
      return;
    }

    if (!code) {
      toast.error('Missing code in callback.');
      navigate('/login', { replace: true });
      return;
    }

    let savedState = null;
    let savedRedirect = null;
    try {
      savedState = sessionStorage.getItem('lovli_oauth_state');
      savedRedirect = sessionStorage.getItem('lovli_oauth_redirect_uri');
      sessionStorage.removeItem('lovli_oauth_state');
      sessionStorage.removeItem('lovli_oauth_redirect_uri');
    } catch {
      /* ignore */
    }

    if (!savedState || savedState !== state) {
      toast.error('Sign-in state mismatch. Try again.');
      navigate('/login', { replace: true });
      return;
    }

    // The redirect_uri sent to /token must EXACTLY match what was used at /authorize.
    const redirectUri = savedRedirect || window.location.origin + '/auth';

    (async () => {
      try {
        const user = await exchangeGoogleCode({ code, redirect_uri: redirectUri, state });
        if (window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        navigate(user?.onboarding_complete ? '/app' : '/onboarding', { replace: true });
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Sign-in failed. Try again.');
        navigate('/login', { replace: true });
      }
    })();
  }, [exchangeGoogleCode, navigate, params]);

  return (
    <div className="min-h-screen lovli-noise bg-lovli-bg flex items-center justify-center px-6">
      <LoadingState />
    </div>
  );
}

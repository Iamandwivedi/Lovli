import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import LoadingState from '@/components/LoadingState';
import { toast } from 'sonner';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { exchangeGoogleSession } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const hash = window.location.hash || '';
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      toast.error('Missing session id in callback.');
      navigate('/login', { replace: true });
      return;
    }
    const sessionId = decodeURIComponent(m[1]);

    (async () => {
      try {
        const user = await exchangeGoogleSession(sessionId);
        // Clean URL (drop the hash) before navigating
        if (window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        if (user?.onboarding_complete) {
          navigate('/app', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Sign-in failed. Try again.');
        navigate('/login', { replace: true });
      }
    })();
  }, [exchangeGoogleSession, navigate]);

  return (
    <div className="min-h-screen lovli-noise flex items-center justify-center px-6">
      <LoadingState />
    </div>
  );
}

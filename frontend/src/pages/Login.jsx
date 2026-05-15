import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import AuthGoogleButton from '@/components/AuthGoogleButton';
import LovliMark from '@/components/LovliMark';
import { toast } from 'sonner';
import { LockKeyhole } from 'lucide-react';

const INPUT_CLS =
  'bg-lovli-card border-lovli-border text-lovli-text placeholder:text-lovli-text-faint h-11';

export default function Login() {
  const { loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Enter email and password.');
      return;
    }
    try {
      setSubmitting(true);
      await loginWithEmail(email, password);
      navigate('/app', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Couldn’t sign you in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen lovli-noise bg-lovli-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md" data-testid="login-page">
        <div className="mb-7 flex items-center gap-2">
          <LovliMark size={36} />
          <span className="font-display text-xl font-semibold tracking-tight text-lovli-text">
            Lovli
          </span>
        </div>

        <div className="lovli-glass rounded-2xl p-6">
          <h1 className="font-display text-[22px] font-semibold text-lovli-text">Welcome back</h1>
          <p className="mt-1.5 text-[14px] text-lovli-text-muted">
            Sign in to keep your generations and memory cards.
          </p>
          <p
            className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-lovli-text-muted"
            data-testid="login-privacy-cue"
          >
            <LockKeyhole className="h-3 w-3 text-lovli-lavender/80" />
            Your chats stay yours.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-lovli-text-soft">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                data-testid="login-email-input"
                className={INPUT_CLS}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-lovli-text-soft">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="login-password-input"
                className={INPUT_CLS}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full lovli-cta min-h-[46px] rounded-full"
              data-testid="login-submit-button"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <Separator className="bg-lovli-border flex-1" />
            <span className="text-[11px] uppercase tracking-wider text-lovli-text-muted">or</span>
            <Separator className="bg-lovli-border flex-1" />
          </div>

          <AuthGoogleButton testId="login-google-button" />

          <p className="mt-6 text-center text-sm text-lovli-text-muted">
            New to Lovli?{' '}
            <Link
              to="/signup"
              className="text-lovli-text underline-offset-2 hover:underline"
              data-testid="login-signup-link"
            >
              Create an account
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center text-[11px] text-lovli-text-muted">
          By continuing you agree to our{' '}
          <Link to="/terms" className="underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline">
            Privacy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

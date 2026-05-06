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
    <div className="min-h-screen lovli-noise flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md" data-testid="login-page">
        <div className="mb-6 flex items-center gap-2">
          <LovliMark size={36} />
          <span className="font-display text-xl font-semibold tracking-tight text-white">
            Lovli
          </span>
        </div>

        <div className="lovli-glass rounded-2xl p-5">
          <h1 className="font-display text-2xl font-semibold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-white/65">
            Sign in to keep your generations and memory cards.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                data-testid="login-email-input"
                className="bg-white/[0.06] border-white/12 text-white placeholder:text-white/40"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/80">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="login-password-input"
                className="bg-white/[0.06] border-white/12 text-white placeholder:text-white/40"
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full lovli-cta min-h-[44px]"
              data-testid="login-submit-button"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <Separator className="bg-white/10 flex-1" />
            <span className="text-[11px] uppercase tracking-wider text-white/45">or</span>
            <Separator className="bg-white/10 flex-1" />
          </div>

          <AuthGoogleButton testId="login-google-button" />

          <p className="mt-5 text-center text-sm text-white/65">
            New to Lovli?{' '}
            <Link
              to="/signup"
              className="text-white underline-offset-2 hover:underline"
              data-testid="login-signup-link"
            >
              Create an account
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center text-[11px] text-white/45">
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

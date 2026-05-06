import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import AuthGoogleButton from '@/components/AuthGoogleButton';
import { toast } from 'sonner';

export default function Signup() {
  const { signupWithEmail } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Fill in all fields.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    try {
      setSubmitting(true);
      await signupWithEmail(name, email, password);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen lovli-noise flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md" data-testid="signup-page">
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400 shadow-[0_0_22px_rgba(99,102,241,0.4)]">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-white">
            Lovli
          </span>
        </div>

        <div className="lovli-glass rounded-2xl p-5">
          <h1 className="font-display text-2xl font-semibold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-white/65">
            Replies that sound like you, in seconds.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-white/80">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                data-testid="signup-name-input"
                className="bg-white/[0.06] border-white/12 text-white placeholder:text-white/40"
                autoComplete="name"
              />
            </div>
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
                data-testid="signup-email-input"
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
                placeholder="At least 6 characters"
                data-testid="signup-password-input"
                className="bg-white/[0.06] border-white/12 text-white placeholder:text-white/40"
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full lovli-cta text-white min-h-[44px]"
              data-testid="signup-submit-button"
            >
              {submitting ? 'Creating…' : 'Create account'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <Separator className="bg-white/10 flex-1" />
            <span className="text-[11px] uppercase tracking-wider text-white/45">or</span>
            <Separator className="bg-white/10 flex-1" />
          </div>

          <AuthGoogleButton testId="signup-google-button" />

          <p className="mt-5 text-center text-sm text-white/65">
            Already have an account?{' '}
            <Link to="/login" className="text-white underline-offset-2 hover:underline" data-testid="signup-login-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

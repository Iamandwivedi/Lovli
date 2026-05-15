import React, { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Sparkles, Check, LockKeyhole } from 'lucide-react';

/**
 * Pro tab — calm, AI-focused early-access screen.
 *
 * Important: NO payments, NO Stripe, NO subscription switching, NO real Pro
 * activation. CTA submits to the existing /api/waitlist endpoint (unchanged).
 */

const FREE_FEATURES = [
  '8 generations / day',
  '3 replies each time',
  'Basic vibes',
  'Standard memory',
];

const PRO_FEATURES = [
  'Unlimited generations',
  'Advanced memory',
  'More reply styles',
  'Early access to new AI features',
];

const PRO_REASONS = [
  'Unlimited replies',
  'Advanced memory',
  'More reply styles',
  'Early AI features',
  'Not sure yet',
];

function PlanCard({ title, tagline, features, current, isPro }) {
  return (
    <div
      className={`relative rounded-2xl border p-5 ${
        isPro
          ? 'border-lovli-lavender/45 bg-lovli-card-2/85 shadow-[0_14px_44px_rgba(167,139,250,0.10)]'
          : 'border-lovli-border bg-lovli-card-2/60'
      }`}
      data-testid={isPro ? 'pro-plan-card' : 'free-plan-card'}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-[17px] font-semibold text-lovli-text">
            {title}
          </h3>
          {current && (
            <span
              className="rounded-full border border-lovli-border bg-lovli-card px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-lovli-text-muted"
              data-testid="plan-current-tag"
            >
              Current
            </span>
          )}
        </div>
        {isPro && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-lovli-lavender/45 bg-lovli-lavender/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-lovli-text-soft"
            data-testid="pro-coming-soon-badge"
          >
            <Sparkles className="h-3 w-3 text-lovli-lavender" /> Coming soon
          </span>
        )}
      </div>
      <p className="mt-1 text-[12.5px] text-lovli-text-muted">{tagline}</p>

      <ul className="mt-4 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                isPro
                  ? 'bg-lovli-lavender/15 border border-lovli-lavender/40'
                  : 'bg-lovli-card border border-lovli-border'
              }`}
            >
              <Check
                className={`h-2.5 w-2.5 ${
                  isPro ? 'text-lovli-lavender' : 'text-lovli-text-soft'
                }`}
                strokeWidth={3.5}
              />
            </span>
            <span className="text-[13.5px] leading-snug text-lovli-text-soft">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReasonChip({ value, selected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      data-testid={`pro-reason-${value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      className={`min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lovli-lavender/55 ${
        selected
          ? 'lovli-chip-active'
          : 'border-lovli-border bg-lovli-card text-lovli-text-soft/85 hover:bg-lovli-card-2 hover:border-lovli-border-strong hover:text-lovli-text'
      }`}
    >
      {value}
    </button>
  );
}

function ProEarlyAccessForm({ defaultEmail }) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!email) {
      toast.error('Add your email so we can let you in.');
      return;
    }
    try {
      setSubmitting(true);
      // Unchanged backend endpoint — same shape as the existing Memory form.
      await api.post('/waitlist', {
        email,
        type: 'pro',
        source: 'pro-page',
        payload: reason
          ? { question: 'What do you want most from Pro?', answer: reason }
          : {},
      });
      setDone(true);
      toast.success('You’re on the Pro early access list.');
    } catch {
      toast.error('Could not save right now. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        className="rounded-2xl border border-lovli-lavender/35 bg-lovli-lavender/8 p-4 text-[13.5px] text-lovli-text-soft"
        data-testid="pro-early-access-success"
      >
        You’re on the Pro early access list. We’ll email you when it opens.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4"
      data-testid="pro-early-access-form"
    >
      <div className="space-y-1.5">
        <label
          className="text-[12.5px] font-medium text-lovli-text-soft"
          htmlFor="pro-email"
        >
          Email
        </label>
        <Input
          id="pro-email"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="pro-early-access-email-input"
          className="bg-lovli-card border-lovli-border text-lovli-text placeholder:text-lovli-text-faint h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[12.5px] font-medium text-lovli-text-soft">
          What do you want most from Pro?
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What do you want most from Pro?">
          {PRO_REASONS.map((r) => (
            <ReasonChip
              key={r}
              value={r}
              selected={reason === r}
              onSelect={setReason}
            />
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full lovli-cta min-h-[46px] rounded-full"
        data-testid="pro-early-access-submit-button"
      >
        {submitting ? 'Sending…' : 'Get Early Access'}
      </Button>
    </form>
  );
}

export default function Pro() {
  const { user } = useAuth();
  const isFree = (user?.plan || 'free') !== 'pro';

  return (
    <AppShell>
      <div data-testid="pro-page" className="space-y-6">
        {/* Hero — calm, AI-focused, no fake urgency */}
        <section
          className="relative overflow-hidden rounded-3xl border border-lovli-border bg-lovli-card-2/70 p-5"
          data-testid="pro-hero"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(70% 60% at 85% 0%, rgba(167,139,250,0.16), transparent 60%), radial-gradient(60% 50% at 10% 100%, rgba(56,189,248,0.06), transparent 60%)',
            }}
          />
          <div className="relative">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-lovli-lavender/45 bg-lovli-lavender/10 px-2.5 py-1 text-[11px] font-medium text-lovli-text-soft"
              data-testid="pro-status-badge"
            >
              <Sparkles className="h-3 w-3 text-lovli-lavender" /> Coming soon
            </span>
            <h1 className="mt-3 font-display text-[22px] font-semibold leading-tight text-lovli-text">
              More replies. Smarter personalization.
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-lovli-text-soft">
              For users who want unlimited generations, better memory, and early access
              to new AI features.
            </p>
          </div>
        </section>

        {/* Free vs Pro — two calm stacked cards */}
        <section className="space-y-3" data-testid="pro-comparison">
          <PlanCard
            title="Free"
            tagline="What you get today."
            features={FREE_FEATURES}
            current={isFree}
            isPro={false}
          />
          <PlanCard
            title="Lovli Pro"
            tagline="More replies, deeper memory, early AI features."
            features={PRO_FEATURES}
            current={false}
            isPro
          />
        </section>

        {/* Early access form — short, calm, non-survey */}
        <section
          className="lovli-glass rounded-2xl p-5"
          data-testid="pro-early-access-section"
        >
          <h2 className="font-display text-[16px] font-semibold text-lovli-text">
            Get early access
          </h2>
          <p className="mt-1 text-[13px] text-lovli-text-muted">
            Drop your email and tell us what matters most.
          </p>
          <div className="mt-4">
            <ProEarlyAccessForm defaultEmail={user?.email || ''} />
          </div>
        </section>

        {/* Footer trust line */}
        <p
          className="inline-flex items-center gap-1.5 px-1 text-[11.5px] text-lovli-text-muted"
          data-testid="pro-privacy-cue"
        >
          <LockKeyhole className="h-3 w-3 text-lovli-lavender/80" />
          We’ll only email you about Pro early access.
        </p>
      </div>
    </AppShell>
  );
}

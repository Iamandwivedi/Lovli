import React from 'react';
import AppShell from '@/components/AppShell';
import EarlyAccessForm from '@/components/EarlyAccessForm';
import { Sparkles, Check, Minus } from 'lucide-react';
import { useAuth } from '@/lib/auth';

/**
 * Pro tab — always shows Free vs Pro side-by-side (mobile + desktop) for fast scanning.
 * Each row is one feature; left column = Free, right column = Pro.
 */
const FEATURES = [
  { label: 'Generations / day', free: '8', pro: 'Unlimited' },
  { label: '3 reply options', free: 'yes', pro: 'yes' },
  { label: 'Screenshot upload', free: 'yes', pro: 'yes' },
  { label: 'Core vibes', free: 'yes', pro: 'yes' },
  { label: 'Advanced reply styles', free: 'no', pro: 'yes' },
  { label: 'Real Indian Wingman', free: 'no', pro: 'Human guidance' },
  { label: 'Memory early access', free: 'no', pro: 'yes' },
  { label: 'Priority access', free: 'no', pro: 'yes' },
];

function Cell({ value, accent }) {
  if (value === 'yes') {
    return (
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
          accent
            ? 'bg-lovli-lavender/15 border border-lovli-lavender/45 text-lovli-lavender'
            : 'bg-lovli-card border border-lovli-border text-lovli-text-soft'
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (value === 'no') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lovli-card border border-lovli-border text-lovli-text-faint">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span
      className={`text-[12px] font-medium leading-tight ${
        accent ? 'text-lovli-text' : 'text-lovli-text-soft'
      }`}
    >
      {value}
    </span>
  );
}

export default function Pro() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div data-testid="pro-page" className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-lovli-border bg-lovli-card-2/70 p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(70% 60% at 80% 0%, rgba(167,139,250,0.16), transparent 60%), radial-gradient(60% 50% at 10% 100%, rgba(56,189,248,0.08), transparent 60%)',
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-lovli-lavender/45 bg-lovli-lavender/10 px-2.5 py-1 text-[11px] text-lovli-text-soft">
              <Sparkles className="h-3 w-3 text-lovli-lavender" /> Coming soon — early access
            </span>
            <h1 className="mt-3 font-display text-[22px] font-semibold text-lovli-text">
              Lovli Pro
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-lovli-text-soft">
              Get unlimited replies + real human guidance from someone who understands Indian
              dating.
            </p>
          </div>
        </section>

        {/* Side-by-side comparison */}
        <section
          className="rounded-2xl border border-lovli-border bg-lovli-card-2/60 overflow-hidden"
          data-testid="pro-comparison"
        >
          {/* Header row */}
          <div className="grid grid-cols-[1fr_72px_92px] sm:grid-cols-[1.4fr_1fr_1fr] gap-2 px-3 sm:px-4 py-3 border-b border-lovli-border bg-lovli-card/40">
            <span className="text-[11px] font-medium uppercase tracking-wider text-lovli-text-muted">
              Feature
            </span>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[12px] font-semibold text-lovli-text-soft">Free</span>
              {user?.plan === 'free' && (
                <span className="mt-0.5 rounded-full border border-lovli-border bg-lovli-card px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-lovli-text-muted">
                  Current
                </span>
              )}
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="font-display text-[12px] font-semibold text-lovli-text">
                Pro
              </span>
              <span className="mt-0.5 rounded-full border border-lovli-lavender/45 bg-lovli-lavender/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-lovli-text-soft">
                Early access
              </span>
            </div>
          </div>

          {FEATURES.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_72px_92px] sm:grid-cols-[1.4fr_1fr_1fr] gap-2 items-center px-3 sm:px-4 py-3 ${
                i % 2 === 1 ? 'bg-lovli-card/25' : ''
              }`}
            >
              <span className="text-[13px] text-lovli-text-soft leading-snug">
                {row.label}
              </span>
              <div className="flex justify-center">
                <Cell value={row.free} />
              </div>
              <div className="flex justify-center">
                <Cell value={row.pro} accent />
              </div>
            </div>
          ))}
        </section>

        <section className="lovli-glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold text-lovli-text">Get early access</h2>
          <p className="mt-1 text-sm text-lovli-text-muted">
            Drop your email and tell us what you need most help with. We’ll let you in.
          </p>
          <div className="mt-4">
            <EarlyAccessForm
              type="pro"
              source="pro-page"
              defaultEmail={user?.email || ''}
              question="Replies, first dates, confusing situations, confidence, long-term dating, other?"
              successMessage="You’re on the Pro early access list."
              testIdPrefix="pro-early-access"
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

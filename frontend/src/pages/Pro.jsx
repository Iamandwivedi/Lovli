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
            ? 'bg-gradient-to-br from-violet-500 to-sky-400 text-white'
            : 'bg-white/[0.08] text-white/85'
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (value === 'no') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04] text-white/35">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span
      className={`text-[12px] font-medium leading-tight ${
        accent ? 'text-white' : 'text-white/85'
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
      <div data-testid="pro-page" className="space-y-5">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              backgroundImage:
                'radial-gradient(70% 60% at 80% 0%, rgba(168,85,247,0.20), transparent 60%), radial-gradient(60% 50% at 10% 100%, rgba(56,189,248,0.14), transparent 60%)',
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/30 bg-violet-500/15 px-2.5 py-1 text-[11px] text-white/85">
              <Sparkles className="h-3 w-3" /> Coming soon — early access
            </span>
            <h1 className="mt-3 font-display text-2xl font-semibold text-white">Lovli Pro</h1>
            <p className="mt-1 text-sm text-white/75">
              Get unlimited replies + real human guidance from someone who understands Indian
              dating.
            </p>
          </div>
        </section>

        {/* Side-by-side comparison: a single 3-column row layout */}
        <section
          className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden"
          data-testid="pro-comparison"
        >
          {/* Header row */}
          <div className="grid grid-cols-[1fr_72px_92px] sm:grid-cols-[1.4fr_1fr_1fr] gap-2 px-3 sm:px-4 py-3 border-b border-white/8 bg-white/[0.02]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/45">
              Feature
            </span>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[12px] font-semibold text-white/80">Free</span>
              {user?.plan === 'free' && (
                <span className="mt-0.5 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/55">
                  Current
                </span>
              )}
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="font-display text-[12px] font-semibold text-white">
                Pro
              </span>
              <span className="mt-0.5 rounded-full border border-violet-300/30 bg-gradient-to-r from-violet-500/20 to-sky-400/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/85">
                Early access
              </span>
            </div>
          </div>

          {FEATURES.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_72px_92px] sm:grid-cols-[1.4fr_1fr_1fr] gap-2 items-center px-3 sm:px-4 py-2.5 ${
                i % 2 === 1 ? 'bg-white/[0.015]' : ''
              }`}
            >
              <span className="text-[13px] text-white/82 leading-snug">{row.label}</span>
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
          <h2 className="font-display text-lg font-semibold text-white">Get early access</h2>
          <p className="mt-1 text-sm text-white/65">
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

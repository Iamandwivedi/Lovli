import React from 'react';
import AppShell from '@/components/AppShell';
import EarlyAccessForm from '@/components/EarlyAccessForm';
import { Sparkles, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const FREE = [
  '8 generations / day',
  '3 replies each time',
  'Core vibes',
  'Screenshot upload',
];

const PRO = [
  'Unlimited generations',
  'More reply styles + tone control',
  'Real Indian Wingman — human guidance',
  'Priority access to new features',
  'Early access to Lovli Memory',
];

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
              Get unlimited replies + real human guidance from someone who understands Indian dating.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">Free</h2>
              <span className="text-xs text-white/55">Current{user?.plan === 'free' ? ' plan' : ''}</span>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-300/90" />
                  <span>{f}</span>
                </li>
              ))}
              <li className="flex items-start gap-2 text-white/45">
                <X className="mt-0.5 h-4 w-4" />
                <span>Real Indian Wingman</span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-violet-300/25 bg-gradient-to-b from-violet-500/[0.10] via-indigo-500/[0.06] to-sky-400/[0.04] p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">Pro</h2>
              <span className="text-xs text-white/65">Early access</span>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-white/85">
              {PRO.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-violet-300" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
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

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import LovliMark from '@/components/LovliMark';

export default function TopHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const planLabel = user?.plan === 'pro' ? 'Pro' : 'Free';

  return (
    <header
      // Sticky at the very top, fully attached (no gap), safe-area-aware.
      // We extend left/right out of the parent's x-padding via -mx-4.
      className="sticky top-0 z-30 -mx-4 px-4 bg-lovli-bg/85 backdrop-blur-xl border-b border-lovli-border/70"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 0.6rem)',
        paddingBottom: '0.6rem',
      }}
      data-testid="top-header"
    >
      <div className="flex items-center justify-between">
        <Link
          to="/app"
          className="flex items-center gap-2 group"
          data-testid="top-header-logo"
        >
          <LovliMark size={28} />
          <span className="font-display text-base font-semibold tracking-tight text-lovli-text">
            Lovli
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              planLabel === 'Pro'
                ? 'border-lovli-lavender/45 bg-lovli-lavender/10 text-lovli-text'
                : 'border-lovli-border bg-lovli-card text-lovli-text-soft/85'
            }`}
            data-testid="top-header-plan-badge"
          >
            {planLabel}
          </span>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-label="Open settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-lovli-border bg-lovli-card text-lovli-text-soft hover:bg-lovli-card-2 hover:border-lovli-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lovli-lavender/55 transition-colors"
            data-testid="top-header-settings-button"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

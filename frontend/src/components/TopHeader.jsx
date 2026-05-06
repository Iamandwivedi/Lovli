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
      className="sticky top-0 z-30 -mx-4 px-4 bg-[#070812]/92 backdrop-blur-xl border-b border-white/[0.04]"
      style={{
        // Visually fill the iPhone notch / status bar area.
        paddingTop: 'calc(env(safe-area-inset-top) + 0.55rem)',
        paddingBottom: '0.55rem',
      }}
      data-testid="top-header"
    >
      <div className="flex items-center justify-between">
        <Link
          to="/app"
          className="flex items-center gap-2"
          data-testid="top-header-logo"
        >
          <LovliMark size={28} />
          <span className="font-display text-base font-semibold tracking-tight text-white">
            Lovli
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
              planLabel === 'Pro'
                ? 'border-violet-300/30 bg-gradient-to-r from-violet-500/20 to-sky-400/20 text-white'
                : 'border-white/10 bg-white/[0.04] text-white/75'
            }`}
            data-testid="top-header-plan-badge"
          >
            {planLabel}
          </span>
          <button
            onClick={() => navigate('/settings')}
            aria-label="Open settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 transition-colors"
            data-testid="top-header-settings-button"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

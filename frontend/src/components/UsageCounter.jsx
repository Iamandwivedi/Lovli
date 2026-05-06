import React from 'react';

export default function UsageCounter({ used, limit, plan }) {
  if (plan === 'pro') {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-gradient-to-r from-violet-500/18 to-sky-400/12 px-3 py-1.5 text-xs text-white/85"
        data-testid="reply-usage-counter"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Pro — unlimited generations
      </div>
    );
  }
  const remaining = Math.max(0, (limit ?? 8) - (used ?? 0));
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/75"
      data-testid="reply-usage-counter"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
      {remaining > 0
        ? `${used ?? 0} of ${limit ?? 8} used today`
        : "You’ve used today’s 8 free replies"}
    </div>
  );
}

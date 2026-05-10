import React from 'react';

export default function UsageCounter({ used, limit, plan }) {
  if (plan === 'pro') {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border border-lovli-lavender/35 bg-lovli-lavender/10 px-3 py-1.5 text-xs text-lovli-text-soft"
        data-testid="reply-usage-counter"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-lovli-lavender shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
        Pro — unlimited generations
      </div>
    );
  }
  const remaining = Math.max(0, (limit ?? 8) - (used ?? 0));
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-lovli-border bg-lovli-card px-3 py-1.5 text-xs text-lovli-text-muted"
      data-testid="reply-usage-counter"
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          remaining > 0
            ? 'bg-lovli-lavender shadow-[0_0_6px_rgba(167,139,250,0.5)]'
            : 'bg-lovli-text-faint'
        }`}
      />
      {remaining > 0
        ? `${used ?? 0} of ${limit ?? 8} used today`
        : "You’ve used today’s 8 free replies"}
    </div>
  );
}

import React from 'react';

export function GlassCard({ className = '', children, ...rest }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-lovli-border bg-lovli-card-2/80 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.55)] before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(120%_80%_at_20%_0%,rgba(167,139,250,0.06),transparent_60%)] before:pointer-events-none ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export default GlassCard;

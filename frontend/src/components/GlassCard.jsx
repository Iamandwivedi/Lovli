import React from 'react';

export function GlassCard({ className = '', children, ...rest }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)] before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.10),transparent_55%)] before:pointer-events-none ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export default GlassCard;

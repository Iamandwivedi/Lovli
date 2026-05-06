import React from 'react';

/**
 * Lovli brand mark — chat bubble with a sparkle inside.
 * Uses a single inline SVG with the violet→indigo→sky brand gradient.
 *
 * Sizes: pass `size` (px) or use the default 28.
 */
export default function LovliMark({ size = 28, className = '', glow = true }) {
  const gradientId = React.useId().replace(/:/g, '') + '-lovli';
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      data-testid="lovli-mark"
    >
      {glow && (
        <span
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 50%, rgba(99,102,241,0.45), transparent 70%)',
            filter: 'blur(6px)',
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
      >
        {/* Chat bubble: rounded rectangle with bottom-left tail */}
        <path
          d="M7 4h18a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H15.6l-4.5 4.2A1 1 0 0 1 9.4 25.6V22H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
          fill={`url(#${gradientId})`}
        />
        {/* 4-pointed sparkle / star */}
        <path
          d="M16 8.4l1.35 2.95L20.3 12.7l-2.95 1.35L16 17l-1.35-2.95L11.7 12.7l2.95-1.35L16 8.4z"
          fill="#ffffff"
        />
        {/* small accent sparkle */}
        <circle cx="22.5" cy="7.5" r="1.1" fill="#ffffff" opacity="0.9" />
        <defs>
          <linearGradient
            id={gradientId}
            x1="4"
            y1="4"
            x2="28"
            y2="26"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#A855F7" />
            <stop offset="0.5" stopColor="#6366F1" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

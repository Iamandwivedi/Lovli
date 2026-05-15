import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquareText, Sparkles, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';

const TABS = [
  { to: '/app', label: 'Reply', icon: MessageSquareText, testId: 'bottom-nav-reply' },
  { to: '/pro', label: 'Pro', icon: Sparkles, testId: 'bottom-nav-pro' },
  { to: '/memory', label: 'Memory', icon: BrainCircuit, testId: 'bottom-nav-memory' },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed left-1/2 bottom-0 z-[10000] w-[min(440px,calc(100vw-20px))] -translate-x-1/2"
      style={{
        // Stays floating with a comfortable gutter above the iPhone home indicator /
        // Android nav bar. Safe-area-aware on every modern mobile browser.
        paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom) + 6px))',
        // Prevent the nav from ever capturing scroll on overflowing content
        // while still being interactive.
        pointerEvents: 'none',
      }}
      data-testid="bottom-nav"
    >
      <div
        // Pill-shaped floating glass card with translucent dark background,
        // subtle border, and soft shadow. pointer-events re-enabled here.
        className="flex items-stretch rounded-[24px] border border-lovli-border bg-lovli-card-2/82 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.04)_inset]"
        style={{ pointerEvents: 'auto' }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = pathname === t.to || (t.to === '/app' && pathname === '/');
          return (
            <NavLink
              to={t.to}
              key={t.to}
              data-testid={t.testId}
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
              // Comfortable thumb target: ~58-64px tall, generous tap area.
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-2 py-3 text-[11px] font-medium transition-colors focus-visible:outline-none ${
                active
                  ? 'text-lovli-lavender'
                  : 'text-lovli-text-muted hover:text-lovli-text-soft'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.7 }}
                  aria-hidden="true"
                  className="absolute top-1.5 h-[3px] w-8 rounded-full bg-lovli-lavender shadow-[0_0_14px_rgba(167,139,250,0.6)]"
                />
              )}
              <Icon
                className="h-[18px] w-[18px]"
                strokeWidth={active ? 2.2 : 1.7}
                aria-hidden="true"
              />
              <span className={active ? '' : 'text-lovli-text-muted'}>{t.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

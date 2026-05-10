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
      className="fixed left-1/2 bottom-0 z-[10000] w-[min(420px,calc(100vw-20px))] -translate-x-1/2"
      style={{
        // Sit at the very bottom but keep a small gutter above the iPhone home indicator.
        paddingBottom: 'max(10px, calc(env(safe-area-inset-bottom) + 4px))',
      }}
      data-testid="bottom-nav"
    >
      <div className="lovli-glass rounded-[22px] flex overflow-hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = pathname === t.to || (t.to === '/app' && pathname === '/');
          return (
            <NavLink
              to={t.to}
              key={t.to}
              data-testid={t.testId}
              aria-label={t.label}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-lovli-text'
                  : 'text-lovli-text-muted hover:text-lovli-text-soft'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
                  className="absolute -top-[3px] h-[3px] w-9 rounded-full bg-lovli-lavender shadow-[0_0_18px_rgba(167,139,250,0.55)]"
                />
              )}
              <Icon
                className={`h-5 w-5 transition-colors ${active ? 'text-lovli-lavender' : ''}`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

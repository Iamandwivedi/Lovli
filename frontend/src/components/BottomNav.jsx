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
        paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      }}
      data-testid="bottom-nav"
    >
      <div className="lovli-glass rounded-[22px] flex">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = pathname === t.to || (t.to === '/app' && pathname === '/');
          return (
            <NavLink
              to={t.to}
              key={t.to}
              data-testid={t.testId}
              aria-label={t.label}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors ${
                active ? 'text-white' : 'text-white/65 hover:text-white/85'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
                  className="absolute -top-1 h-1 w-10 rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400 shadow-[0_0_24px_rgba(99,102,241,0.55)]"
                />
              )}
              <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

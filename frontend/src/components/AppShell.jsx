import React from 'react';
import TopHeader from '@/components/TopHeader';
import BottomNav from '@/components/BottomNav';

export default function AppShell({ children, hideNav = false }) {
  return (
    <div
      className="relative min-h-screen lovli-noise bg-lovli-bg"
      data-testid="app-shell"
    >
      <div
        className="mx-auto w-full max-w-[480px] px-4 sm:max-w-[520px] md:max-w-[560px]"
        style={{
          // Reserved bottom space so the floating tab bar NEVER overlaps the
          // last in-screen content (CTAs, reply cards, form actions). See
          // --lovli-nav-safe-bottom in index.css for the full formula
          // (nav pill + outer gutter + 24px breathing + safe-area inset).
          paddingBottom: 'var(--lovli-nav-safe-bottom)',
        }}
      >
        <TopHeader />
        <main className="mt-4">{children}</main>
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

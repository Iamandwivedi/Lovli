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
          // Generous bottom padding so content always scrolls cleanly
          // above the floating bottom nav (~64px tall + 14px gutter
          // + safe-area inset on iPhone).
          paddingBottom:
            'calc(168px + env(safe-area-inset-bottom))',
        }}
      >
        <TopHeader />
        <main className="mt-4">{children}</main>
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

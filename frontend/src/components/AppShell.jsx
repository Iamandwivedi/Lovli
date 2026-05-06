import React from 'react';
import TopHeader from '@/components/TopHeader';
import BottomNav from '@/components/BottomNav';

export default function AppShell({ children, hideNav = false }) {
  return (
    <div className="relative min-h-screen lovli-noise" data-testid="app-shell">
      <div
        className="mx-auto w-full max-w-[480px] px-4 sm:max-w-[520px] md:max-w-[560px]"
        style={{
          // Bottom padding clears the floating bottom nav (~64px tall)
          // plus its safe-area gutter on iPhone Safari.
          paddingBottom:
            'calc(140px + env(safe-area-inset-bottom))',
        }}
      >
        <TopHeader />
        <main className="mt-3">{children}</main>
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

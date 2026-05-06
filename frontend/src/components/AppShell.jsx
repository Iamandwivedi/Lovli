import React from 'react';
import TopHeader from '@/components/TopHeader';
import BottomNav from '@/components/BottomNav';

export default function AppShell({ children, hideNav = false }) {
  return (
    <div className="relative min-h-screen lovli-noise" data-testid="app-shell">
      <div className="mx-auto w-full max-w-[480px] px-4 pt-3 pb-[128px] sm:max-w-[520px] md:max-w-[560px] sm:pb-[120px]">
        <TopHeader />
        <main className="mt-3">{children}</main>
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

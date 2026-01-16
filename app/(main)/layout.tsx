"use client";
import { ReactNode } from 'react';
import ConditionalSideNav from '@/components/layout/ConditionalSideNav';
import MobileTopNav from '@/components/layout/MobileTopNav';
import AuthGate from '@/components/features/auth/AuthGate';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-dvh">
        {/* モバイル用トップナビ：sm未満 */}
        <MobileTopNav />
        
        <div className="max-w-5xl w-full mx-auto flex">
          {/* デスクトップ用サイドナビ：sm以上で表示 */}
          <ConditionalSideNav />
          
          <div className="flex-1 min-w-0">
            <main className="w-full px-4 py-6 pb-20 sm:pb-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

"use client";
import { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import AppFooter from '@/components/layout/AppFooter';

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}

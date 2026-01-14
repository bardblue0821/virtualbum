import Link from 'next/link';
import React from 'react';

export default function AppFooter() {
  return (
    <footer className="w-full border-t border-line py-4 text-center text-sm text-gray-500 bg-background">
      <nav className="flex flex-wrap justify-center gap-6">
        <Link href="/legal/termsofservice" className="hover:underline">利用規約</Link>
        <Link href="/legal/privacy-policy" className="hover:underline">プライバシーポリシー</Link>
        <Link href="/legal/faq" className="hover:underline">FAQ</Link>
      </nav>
      <div className="mt-2">&copy; 2026 Virtualbum</div>
    </footer>
  );
}

"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { useNotificationsBadge } from '@/lib/hooks/useNotificationsBadge';
import { getUser } from '@/lib/db/repositories/user.repository';
import Avatar from '@/components/features/profile/Avatar';
import React from 'react';
import { Button } from '@/components/ui/Button';
import MenuButton from '@/components/ui/MenuButton';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

type Item = { key: string; href: string; label: string; icon: React.ReactNode; badge?: boolean };

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5L12 3l9 7.5"/>
      <path d="M5 10.5V21h14V10.5"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7"/>
      <path d="M20 20l-3.5-3.5"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z"/>
      <path d="M10 20a2 2 0 004 0"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* 本のアイコン */}
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      {/* ＋マーク（右上に小さく） */}
      <line x1="17" y1="5" x2="17" y2="10" strokeWidth="2"/>
      <line x1="14.5" y1="7.5" x2="19.5" y2="7.5" strokeWidth="2"/>
    </svg>
  );
}
function IconKey() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="11" r="3"/>
      <path d="M11 11h10l-2 2 2 2"/>
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 0010 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 005.4 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 005.4 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 5.4a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09c0 .67.39 1.28 1 1.51a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0018.6 9c.67 0 1.28.39 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function makeItems(authed: boolean): Item[] {
  const arr: Item[] = [
    { key: 'home', href: '/timeline', label: 'タイムライン', icon: <IconHome /> },
    { key: 'search', href: '/search', label: '検索', icon: <IconSearch /> },
    { key: 'notification', href: '/notification', label: '通知', icon: <IconBell />, badge: true },
    { key: 'new', href: '/album/new', label: '作成', icon: <IconPlus /> },
  ];
  if (!authed) {
    arr.push({ key: 'login', href: '/login', label: 'ログイン', icon: <IconKey /> });
  }
  return arr;
}

function SideNavInner() {
  const { user } = useAuthUser();
  const unread = useNotificationsBadge();
  const [profileDoc, setProfileDoc] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const gearBtnRef = useRef<HTMLButtonElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { setProfileDoc(null); return; }
      const doc = await getUser(user.uid);
      if (active) setProfileDoc(doc);
    })();
    return () => { active = false; };
  }, [user?.uid]);

  // theme handling
  const theme = useMemo(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);
  const [currentTheme, setCurrentTheme] = useState<string>(theme);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(currentTheme === 'dark' ? 'theme-dark' : 'theme-light');
    try { localStorage.setItem('theme', currentTheme); } catch {}
  }, [currentTheme]);

  const toggleTheme = () => setCurrentTheme(t => t === 'dark' ? 'light' : 'dark');

  const handle = profileDoc?.handle as string | undefined;
  const items = makeItems(!!user);

  // Close gear menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && gearBtnRef.current && !gearBtnRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false); }
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  if (!mounted) return null;

  const iconColorClass = currentTheme === 'dark' ? 'text-white' : 'text-black';

  return (
    <nav ref={navRef as React.RefObject<HTMLElement | null>} aria-label="メインナビ" className="hidden sm:flex w-20 shrink-0 flex-col items-center gap-3 py-3 border-r border-line sticky top-0 h-dvh sidenav-bg">
      {/* Profile on top */}
      <div className="">
        <Link
          href={user && handle ? `/user/${handle}` : (user ? `/user/${user.uid}` : '/login')}
          title="プロフィール"
          aria-label="プロフィール"
          className="flex items-center justify-center w-15 h-15 rounded-lg border-2 border-transparent hover:border-[--accent] transition-colors"
        >
          <Avatar size={56} src={profileDoc?.iconURL || undefined} alt="プロフィール" interactive={false} withBorder={false} />
        </Link>
      </div>
      {items.map((it) => {
        const isNew = it.key === 'new';
        const iconClass = isNew ? 'text-white' : iconColorClass;
        return (
          <Link
            key={it.key}
            href={it.href}
            title={it.label}
            aria-label={it.label}
            data-href={it.href}
            data-new={isNew ? 'true' : 'false'}
            className={`relative flex items-center justify-center w-12 h-12 rounded-lg ${isNew ? 'btn-accent-square' : 'hover:bg-surface-weak'}`}
          >
            <span className={`text-xl leading-none ${iconClass}`} aria-hidden>
              {it.icon}
            </span>
            {it.badge && unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
      {/* Spacer to push settings to bottom */}
      <div className="flex-1" />
      {/* Settings (gear) */}
      <div className="relative">
        <button
          type="button"
          ref={gearBtnRef}
          className="relative flex items-center justify-center w-12 h-12 rounded-lg hover:bg-surface-weak"
          aria-label="設定"
          title="設定"
          onClick={() => setMenuOpen(o => !o)}
        >
          <span className={`text-xl ${iconColorClass}`} aria-hidden><IconGear /></span>
        </button>
        {menuOpen && (
          <div ref={menuRef} className="absolute bottom-14 left-0 z-50 bg-background border border-line rounded-md shadow-md min-w-40 p-2">
            {/* テーマ切り替え */}
            <MenuButton onClick={toggleTheme}>
              {currentTheme === 'dark' ? '☀️ ライトモード' : '🌙 ダークモード'}
            </MenuButton>
            {user && (
              <Link href="/settings/password" className="block w-full">
                <MenuButton onClick={() => setMenuOpen(false)}>
                  🔑 パスワードの変更
                </MenuButton>
              </Link>
            )}
            <Link href="/legal/termsofservice" className="block w-full">
              <MenuButton onClick={() => setMenuOpen(false)}>
                利用規約
              </MenuButton>
            </Link>
            <Link href="/legal/privacy-policy" className="block w-full">
              <MenuButton onClick={() => setMenuOpen(false)}>
                プライバシーポリシー
              </MenuButton>
            </Link>
            <Link href="/legal/faq" className="block w-full">
              <MenuButton onClick={() => setMenuOpen(false)}>
                FAQ
              </MenuButton>
            </Link>
            {user && (
              <MenuButton className="text-red-600" onClick={() => {
                signOut(auth).catch(() => {});
                setMenuOpen(false);
              }}>
                ログアウト
              </MenuButton>
            )}
          </div>
        )}
      </div>
      {/* Route-aware active state without re-rendering parent */}
      <PathHighlighter navRef={navRef} items={items} />
    </nav>
  );
}

// ルート遷移時に親レイアウトの再レンダリングが走っても、
// プロパティが変わらない限り描画をスキップする。
// パスに応じた見た目更新は PathHighlighter の副作用で行う。
export default React.memo(SideNavInner);

function PathHighlighter({ navRef, items }: { navRef: React.RefObject<HTMLElement | null>, items: Item[] }) {
  const path = usePathname();
  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;
    // Hide nav for specific routes without triggering parent re-render
    if (path === '/' || path === '/login') {
      navEl.style.display = 'none';
    } else {
      navEl.style.display = '';
    }

    // Update active styles on links based on current pathname
    const anchors = Array.from(navEl.querySelectorAll('a[data-href]')) as HTMLAnchorElement[];
    anchors.forEach(a => {
      const href = a.getAttribute('data-href') || '';
      const isNew = a.getAttribute('data-new') === 'true';
      const active = path.startsWith(href);
      if (!isNew) {
        if (active) {
          a.classList.add('bg-surface-weak');
        } else {
          a.classList.remove('bg-surface-weak');
        }
      }
    });
  }, [path, navRef]);

  return null;
}

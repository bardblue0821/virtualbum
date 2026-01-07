"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { searchUsersPrefix, searchAlbumsPrefix, searchAlbumsByCommentPrefix, UserHit, AlbumHit } from "../../lib/repos/searchRepo";
import { translateError } from "../../lib/errors";
import Avatar from "@/components/profile/Avatar";
import { SearchAlbumCard } from "@/components/search/SearchAlbumCard";

const PAGE_SIZE = 20;

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  
  // ユーザー検索
  const [users, setUsers] = useState<UserHit[]>([]);
  const [userLimit, setUserLimit] = useState(PAGE_SIZE);
  const [userHasMore, setUserHasMore] = useState(false);
  const [userLoadingMore, setUserLoadingMore] = useState(false);
  
  // アルバム検索
  const [albums, setAlbums] = useState<AlbumHit[]>([]);
  const [albumLimit, setAlbumLimit] = useState(PAGE_SIZE);
  const [albumHasMore, setAlbumHasMore] = useState(false);
  const [albumLoadingMore, setAlbumLoadingMore] = useState(false);
  
  const [history, setHistory] = useState<string[]>([]);
  const timer = useRef<number | null>(null);
  const normalized = useMemo(() => q.trim(), [q]);
  
  // IntersectionObserver用
  const userSentinelRef = useRef<HTMLDivElement | null>(null);
  const albumSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreUsersRef = useRef<() => void>(() => {});
  const loadMoreAlbumsRef = useRef<() => void>(() => {});

  useEffect(() => {
    // 履歴ロード
    try {
      const raw = localStorage.getItem("app:search-history");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setHistory(arr.filter((x) => typeof x === "string"));
      }
    } catch {}
  }, []);

  function saveHistory(term: string) {
    const base = term.trim();
    if (!base) return;
    const v = base.startsWith("@") ? base : base; // そのまま保存（表示/再検索に利用）
    setHistory((prev) => {
      const next = [v, ...prev.filter((x) => x !== v)].slice(0, 10);
      try { localStorage.setItem("app:search-history", JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem("app:search-history"); } catch {}
  }

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!normalized) {
      setUsers([]); setAlbums([]); setErr(null);
      setUserLimit(PAGE_SIZE); setAlbumLimit(PAGE_SIZE);
      setUserHasMore(false); setAlbumHasMore(false);
      return;
    }
    const delay = normalized.startsWith("@") ? 120 : 250;
    timer.current = window.setTimeout(async () => {
      const base = normalized.startsWith("@") ? normalized.slice(1) : normalized;
      setLoading(true); setErr(null);
      // リセット
      setUserLimit(PAGE_SIZE);
      setAlbumLimit(PAGE_SIZE);
      try {
        const [u, a, comm] = await Promise.all([
          searchUsersPrefix(base, PAGE_SIZE + 1),
          searchAlbumsPrefix(base, PAGE_SIZE + 1),
          searchAlbumsByCommentPrefix(base, PAGE_SIZE + 1),
        ]);
        // アルバム: 本文/説明とコメント由来をマージ
        const byId: Record<string, AlbumHit> = {};
        a.forEach((x) => (byId[x.id] = x));
        comm.forEach((x) => { if (!byId[x.id]) byId[x.id] = x; });
        const albumsMerged = Object.values(byId);
        
        setUserHasMore(u.length > PAGE_SIZE);
        setUsers(u.slice(0, PAGE_SIZE));
        setAlbumHasMore(albumsMerged.length > PAGE_SIZE);
        setAlbums(albumsMerged.slice(0, PAGE_SIZE));
      } catch (e: any) {
        setErr(translateError(e));
      } finally {
        setLoading(false);
      }
    }, delay) as unknown as number;
    // cleanup
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [normalized]);

  // ユーザーをもっと読み込む
  const loadMoreUsers = useCallback(async () => {
    if (userLoadingMore || !userHasMore || !normalized) return;
    const base = normalized.startsWith("@") ? normalized.slice(1) : normalized;
    setUserLoadingMore(true);
    try {
      const nextLimit = userLimit + PAGE_SIZE;
      const u = await searchUsersPrefix(base, nextLimit + 1);
      setUserHasMore(u.length > nextLimit);
      setUsers(u.slice(0, nextLimit));
      setUserLimit(nextLimit);
    } catch (e: any) {
      console.error("loadMoreUsers error:", e);
    } finally {
      setUserLoadingMore(false);
    }
  }, [userLoadingMore, userHasMore, normalized, userLimit]);

  // アルバムをもっと読み込む
  const loadMoreAlbums = useCallback(async () => {
    if (albumLoadingMore || !albumHasMore || !normalized) return;
    const base = normalized.startsWith("@") ? normalized.slice(1) : normalized;
    setAlbumLoadingMore(true);
    try {
      const nextLimit = albumLimit + PAGE_SIZE;
      const [a, comm] = await Promise.all([
        searchAlbumsPrefix(base, nextLimit + 1),
        searchAlbumsByCommentPrefix(base, nextLimit + 1),
      ]);
      const byId: Record<string, AlbumHit> = {};
      a.forEach((x) => (byId[x.id] = x));
      comm.forEach((x) => { if (!byId[x.id]) byId[x.id] = x; });
      const albumsMerged = Object.values(byId);
      setAlbumHasMore(albumsMerged.length > nextLimit);
      setAlbums(albumsMerged.slice(0, nextLimit));
      setAlbumLimit(nextLimit);
    } catch (e: any) {
      console.error("loadMoreAlbums error:", e);
    } finally {
      setAlbumLoadingMore(false);
    }
  }, [albumLoadingMore, albumHasMore, normalized, albumLimit]);

  // refを最新に保つ
  useEffect(() => {
    loadMoreUsersRef.current = loadMoreUsers;
    loadMoreAlbumsRef.current = loadMoreAlbums;
  }, [loadMoreUsers, loadMoreAlbums]);

  // IntersectionObserver: ユーザー
  useEffect(() => {
    const sentinel = userSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreUsersRef.current();
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // IntersectionObserver: アルバム
  useEffect(() => {
    const sentinel = albumSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreAlbumsRef.current();
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const base = normalized.startsWith("@") ? normalized : normalized; // 表示通り保存
      if (base) saveHistory(base);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-semibold sticky top-0 z-10 bg-background py-2 border-b border-line">検索</h1>
      <div>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="ユーザー名 / @ハンドル / アルバム名 / 説明 / コメント"
          className="w-full input-underline text-sm"
        />
        {!normalized && history.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs fg-muted">最近の検索</p>
              <button type="button" onClick={clearHistory} className="text-[11px] fg-subtle">クリア</button>
            </div>
            <ul className="border border-base rounded divide-y divide-base">
              {history.map((h, i) => (
                <li key={i} className="text-sm">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover-surface-alt truncate"
                    onClick={() => setQ(h)}
                  >{h}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* 入力中の候補表示は廃止（UI簡素化） */}
        {loading && <p className="text-xs fg-subtle mt-2">検索中...</p>}
        {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section>
          <h2 className="font-medium mb-2">ユーザー {users.length ? `(${users.length})` : ""}</h2>
          {!normalized && <p className="text-sm fg-subtle">キーワードを入力してください</p>}
          {normalized && users.length === 0 && !loading && (<p className="text-sm fg-subtle">該当なし</p>)}
          <ul className="space-y-1">
            {users.map((u) => (
              <li key={u.uid}>
                <Link
                  href={`/user/${u.handle || u.uid}`}
                  className="flex items-center gap-3 rounded px-2 py-2 hover-surface-alt"
                >
                  <Avatar
                    size={36}
                    src={u.iconURL || undefined}
                    alt={u.displayName ? `${u.displayName}のアイコン` : "ユーザーアイコン"}
                    interactive={false}
                    withBorder={false}
                    className="rounded-full shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{u.displayName || "名前未設定"}</div>
                    <div className="text-xs fg-subtle truncate">@{u.handle || u.uid.slice(0, 6)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {userHasMore && <div ref={userSentinelRef} className="h-4" />}
          {userLoadingMore && <p className="text-xs fg-subtle mt-1">読み込み中...</p>}
        </section>

        <section>
          <h2 className="font-medium mb-2">アルバム {albums.length ? `(${albums.length})` : ""}</h2>
          {!normalized && <p className="text-sm fg-subtle">キーワードを入力してください</p>}
          {normalized && albums.length === 0 && !loading && (<p className="text-sm fg-subtle">該当なし</p>)}
          <div className="divide-y divide-line">
            {albums.map((a) => (
              <SearchAlbumCard
                key={a.id}
                id={a.id}
                title={a.title}
                ownerId={a.ownerId}
                ownerName={a.ownerName}
                ownerHandle={a.ownerHandle}
                ownerIconURL={a.ownerIconURL}
                createdAt={a.createdAt}
                firstImageUrl={a.firstImageUrl}
              />
            ))}
          </div>
          {albumHasMore && <div ref={albumSentinelRef} className="h-4" />}
          {albumLoadingMore && <p className="text-xs fg-subtle mt-1">読み込み中...</p>}
        </section>
      </div>
    </div>
  );
}

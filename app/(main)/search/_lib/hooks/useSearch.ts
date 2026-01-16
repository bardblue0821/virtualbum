"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { searchUsersPrefix, searchAlbumsPrefix, searchAlbumsByCommentPrefix, UserHit, AlbumHit } from "@/lib/db/repositories/search.repository";
import { searchUsersByTag, searchAlbumsByTagRich } from "@/lib/db/repositories/tag.repository";
import { translateError } from "@/lib/errors";

const PAGE_SIZE = 20;

export type SearchCategory = 'all' | 'users' | 'albums' | 'userTags' | 'albumTags';

export interface UserTagResult {
  uid: string;
  displayName: string;
  handle: string | null;
  iconURL: string | null;
  tags: string[];
}

export interface AlbumTagResult {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerHandle: string | null;
  ownerIconURL: string | null;
  coverImageURL: string | null;
  firstImageUrl: string | null;
  tags: string[];
  createdAt: any;
}

export function useSearch(initialQuery?: string) {
  const [q, setQ] = useState(initialQuery || "");
  const [category, setCategory] = useState<SearchCategory>('all');
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
  
  // タグ検索結果
  const [userTagResults, setUserTagResults] = useState<UserTagResult[]>([]);
  const [albumTagResults, setAlbumTagResults] = useState<AlbumTagResult[]>([]);
  
  const timer = useRef<number | null>(null);
  const normalized = useMemo(() => q.trim(), [q]);

  // 検索実行
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!normalized) {
      setUsers([]); setAlbums([]); setErr(null);
      setUserLimit(PAGE_SIZE); setAlbumLimit(PAGE_SIZE);
      setUserHasMore(false); setAlbumHasMore(false);
      setUserTagResults([]); setAlbumTagResults([]);
      return;
    }
    const delay = normalized.startsWith("@") ? 120 : 250;
    timer.current = window.setTimeout(async () => {
      const base = normalized.startsWith("@") ? normalized.slice(1) : normalized;
      setLoading(true); setErr(null);
      setUserLimit(PAGE_SIZE);
      setAlbumLimit(PAGE_SIZE);
      try {
        const [u, a, comm, usersByTag, albumsByTag] = await Promise.all([
          searchUsersPrefix(base, PAGE_SIZE + 1),
          searchAlbumsPrefix(base, PAGE_SIZE + 1),
          searchAlbumsByCommentPrefix(base, PAGE_SIZE + 1),
          searchUsersByTag(base, PAGE_SIZE),
          searchAlbumsByTagRich(base, PAGE_SIZE),
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
        setUserTagResults(usersByTag);
        setAlbumTagResults(albumsByTag);
      } catch (e: any) {
        setErr(translateError(e));
      } finally {
        setLoading(false);
      }
    }, delay) as unknown as number;
    
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

  return {
    q,
    setQ,
    category,
    setCategory,
    loading,
    err,
    normalized,
    // Users
    users,
    userHasMore,
    userLoadingMore,
    loadMoreUsers,
    // Albums
    albums,
    albumHasMore,
    albumLoadingMore,
    loadMoreAlbums,
    // Tag results
    userTagResults,
    albumTagResults,
  };
}

"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { User } from "firebase/auth";
import { listLatestAlbumsVMLimited } from "@/lib/services/timeline/list-latest-albums.service";
import type { TimelineItemVM, UserRef } from "@/lib/types/timeline";
import { getUser } from "@/lib/db/repositories/user.repository";
import { subscribeComments } from "@/lib/db/repositories/comment.repository";
import { subscribeLikes } from "@/lib/db/repositories/like.repository";
import { subscribeReposts } from "@/lib/db/repositories/repost.repository";
import { translateError } from "@/lib/errors";
import { listAcceptedFriends } from "@/lib/db/repositories/friend.repository";
import { listWatchedOwnerIds } from "@/lib/db/repositories/watch.repository";
import { getMutedUserIds } from "@/lib/db/repositories/mute.repository";

const PAGE_SIZE = 20;
const MAX_CONCURRENT_SUBSCRIPTIONS = 10;

interface UseTimelineFeedReturn {
  rows: TimelineItemVM[];
  setRows: React.Dispatch<React.SetStateAction<TimelineItemVM[]>>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  friendSet: Set<string>;
  watchSet: Set<string>;
  handleVisibilityChange: (albumId: string, isVisible: boolean) => Promise<void>;
  updateRowByAlbumId: (albumId: string, updater: (row: TimelineItemVM) => TimelineItemVM) => void;
  cleanupSubscriptionForAlbum: (albumId: string) => void;
  userCacheRef: React.MutableRefObject<Map<string, UserRef | null>>;
  resortTimeline: () => void;
  rowsRef: React.MutableRefObject<TimelineItemVM[]>;
}

function toMillis(v: any): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  if (typeof v === "object" && typeof v.seconds === "number") return v.seconds * 1000;
  if (typeof v === "number") return v > 1e12 ? v : v * 1000;
  return 0;
}

/**
 * タイムラインフィードのデータ取得とリアルタイム購読を管理するフック
 */
export function useTimelineFeed(user: User | null | undefined): UseTimelineFeedReturn {
  const [rows, setRows] = useState<TimelineItemVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendSet, setFriendSet] = useState<Set<string>>(new Set());
  const [watchSet, setWatchSet] = useState<Set<string>>(new Set());

  const rowsRef = useRef<TimelineItemVM[]>([]);
  const hasMoreRef = useRef(true);
  const inFlightRef = useRef(false);
  const unsubsByAlbumIdRef = useRef<Map<string, (() => void)[]>>(new Map());
  const userCacheRef = useRef<Map<string, UserRef | null>>(new Map());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<() => void>(() => {});
  const mutedSetRef = useRef<Set<string>>(new Set());
  const visibleAlbumIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  function resortTimeline() {
    setRows((prev) => {
      const sorted = prev.slice().sort((a, b) => {
        const ak =
          toMillis(a.repostedBy?.createdAt) ||
          toMillis((a as any).imageAdded?.createdAt) ||
          toMillis(a.album.createdAt) ||
          0;
        const bk =
          toMillis(b.repostedBy?.createdAt) ||
          toMillis((b as any).imageAdded?.createdAt) ||
          toMillis(b.album.createdAt) ||
          0;
        return bk - ak;
      });
      return sorted;
    });
  }

  function updateRowByAlbumId(albumId: string, updater: (row: TimelineItemVM) => TimelineItemVM) {
    setRows((prev) => prev.map((r) => (r.album.id === albumId ? updater(r) : r)));
  }

  function cleanupSubscriptions() {
    const map = unsubsByAlbumIdRef.current;
    for (const list of map.values()) {
      for (const fn of list) {
        try {
          fn();
        } catch {}
      }
    }
    map.clear();
  }

  function cleanupSubscriptionForAlbum(albumId: string) {
    const map = unsubsByAlbumIdRef.current;
    const list = map.get(albumId);
    if (!list) return;
    for (const fn of list) {
      try {
        fn();
      } catch {}
    }
    map.delete(albumId);
  }

  async function subscribeForRow(row: TimelineItemVM, currentUid: string) {
    const albumId = row.album.id;
    if (!albumId) return;
    if (unsubsByAlbumIdRef.current.has(albumId)) return;

    // comments subscription
    const cUnsub = await subscribeComments(
      albumId,
      (list) => {
        const mutedSet = mutedSetRef.current;
        const filtered = list.filter((c) => !mutedSet.has(c.userId));
        const sorted = [...filtered].sort(
          (a, b) => (a.createdAt?.seconds || a.createdAt || 0) - (b.createdAt?.seconds || b.createdAt || 0)
        );
        const latest = sorted.slice(-1)[0];
        const previewRawDesc = sorted.slice(-3).reverse();
        const userCache = userCacheRef.current;

        (async () => {
          const preview = await Promise.all(
            previewRawDesc.map(async (c) => {
              let cu = userCache.get(c.userId);
              if (cu === undefined) {
                const u = await getUser(c.userId);
                cu = u
                  ? { uid: u.uid, handle: u.handle || null, iconURL: u.iconURL || null, displayName: u.displayName }
                  : null;
                userCache.set(c.userId, cu);
              }
              return { body: c.body, userId: c.userId, user: cu || undefined, createdAt: c.createdAt };
            })
          );
          updateRowByAlbumId(albumId, (r) => ({
            ...r,
            latestComment: latest ? { body: latest.body, userId: latest.userId } : undefined,
            commentsPreview: preview,
            commentCount: filtered.length,
          }));
        })().catch(() => {
          updateRowByAlbumId(albumId, (r) => ({
            ...r,
            latestComment: latest ? { body: latest.body, userId: latest.userId } : undefined,
            commentsPreview: previewRawDesc.map((c) => ({ body: c.body, userId: c.userId, createdAt: c.createdAt })),
            commentCount: filtered.length,
          }));
        });
      },
      () => {}
    );
    {
      const map = unsubsByAlbumIdRef.current;
      const list = map.get(albumId) ?? [];
      list.push(cUnsub);
      map.set(albumId, list);
    }

    // likes subscription
    const lUnsub = await subscribeLikes(
      albumId,
      (list) => {
        const cnt = list.length;
        const meLiked = list.some((x) => x.userId === currentUid);
        updateRowByAlbumId(albumId, (r) => ({ ...r, likeCount: cnt, liked: meLiked }));
      },
      () => {}
    );
    {
      const map = unsubsByAlbumIdRef.current;
      const list = map.get(albumId) ?? [];
      list.push(lUnsub);
      map.set(albumId, list);
    }

    // reposts subscription
    const rpUnsub = await subscribeReposts(
      albumId,
      (list) => {
        const cnt = list.length;
        const me = list.some((x) => x.userId === currentUid);
        updateRowByAlbumId(albumId, (r) => ({ ...r, repostCount: cnt, reposted: me }));
      },
      () => {}
    );
    {
      const map = unsubsByAlbumIdRef.current;
      const list = map.get(albumId) ?? [];
      list.push(rpUnsub);
      map.set(albumId, list);
    }
  }

  const handleVisibilityChange = useCallback(
    async (albumId: string, isVisible: boolean) => {
      const currentUid = user?.uid;
      if (!currentUid) return;

      if (isVisible) {
        visibleAlbumIdsRef.current.add(albumId);
        const currentSubscriptions = unsubsByAlbumIdRef.current.size;
        if (currentSubscriptions >= MAX_CONCURRENT_SUBSCRIPTIONS) {
          return;
        }

        if (!unsubsByAlbumIdRef.current.has(albumId)) {
          const row = rowsRef.current.find((r) => r.album.id === albumId);
          if (row) {
            await subscribeForRow(row, currentUid);
          }
        }
      } else {
        visibleAlbumIdsRef.current.delete(albumId);
        setTimeout(() => {
          if (!visibleAlbumIdsRef.current.has(albumId)) {
            cleanupSubscriptionForAlbum(albumId);
          }
        }, 2000);
      }
    },
    [user]
  );

  async function loadMore() {
    const currentUid = user?.uid;
    if (!currentUid) return;
    if (inFlightRef.current) return;
    if (!hasMoreRef.current) return;

    inFlightRef.current = true;
    setError(null);

    const prev = rowsRef.current;
    const nextLimit = prev.length === 0 ? PAGE_SIZE : prev.length + PAGE_SIZE;
    if (prev.length === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const enriched = await listLatestAlbumsVMLimited(currentUid, nextLimit, userCacheRef.current);

      if (prev.length === 0) {
        setRows(enriched);
        try {
          const [friends, watchedOwners, mutedIds] = await Promise.all([
            listAcceptedFriends(currentUid),
            listWatchedOwnerIds(currentUid),
            getMutedUserIds(currentUid),
          ]);
          const fset = new Set<string>();
          for (const fd of friends) {
            const otherId = fd.userId === currentUid ? fd.targetId : fd.userId;
            if (otherId) fset.add(otherId);
          }
          setFriendSet(fset);
          setWatchSet(new Set(watchedOwners || []));
          mutedSetRef.current = new Set(mutedIds || []);
        } catch {}
      } else {
        const existingIds = new Set(prev.map((r) => r.album.id));
        const appended = enriched.filter((r) => r?.album?.id && !existingIds.has(r.album.id));
        if (appended.length > 0) {
          setRows((p) => [...p, ...appended]);
        }
      }

      setHasMore(enriched.length > prev.length);
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  }

  // Initial load
  useEffect(() => {
    cleanupSubscriptions();
    userCacheRef.current = new Map();
    setRows([]);
    setHasMore(true);
    setError(null);

    if (!user?.uid) {
      setLoading(false);
      return;
    }

    loadMore().catch(() => {});

    return () => {
      cleanupSubscriptions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Keep loadMoreRef updated
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMoreRef.current();
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return {
    rows,
    setRows,
    loading,
    loadingMore,
    hasMore,
    error,
    setError,
    sentinelRef,
    friendSet,
    watchSet,
    handleVisibilityChange,
    updateRowByAlbumId,
    cleanupSubscriptionForAlbum,
    userCacheRef,
    resortTimeline,
    rowsRef,
  };
}

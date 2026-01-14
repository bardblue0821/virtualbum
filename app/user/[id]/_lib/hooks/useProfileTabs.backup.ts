"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { listAlbumsByOwner, getAlbum, deleteAlbum } from '@/lib/repos/albumRepo';
import { listAlbumIdsByUploader, countImagesByUploader, listImagesByUploaderPage } from '@/lib/repos/imageRepo';
import { listCommentsByUser, listComments, addComment } from '@/lib/repos/commentRepo';
import { countLikes, hasLiked, toggleLike, listLikedAlbumIdsByUser } from '@/lib/repos/likeRepo';
import { countReposts, hasReposted, toggleRepost } from '@/lib/repos/repostRepo';
import { listReactionsByAlbum, toggleReaction } from '@/lib/repos/reactionRepo';
import { listImages } from '@/lib/repos/imageRepo';
import { getUser } from '@/lib/repos/userRepo';
import { addNotification } from '@/lib/repos/notificationRepo';
import { translateError } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';
import type { PhotoItem } from '@/components/gallery/GalleryGrid';

export type TabType = 'own' | 'joined' | 'comments' | 'images' | 'likes';

export interface UserRef {
  uid: string;
  handle: string | null;
  iconURL: string | null;
  displayName?: string;
}

export interface AlbumRowData {
  album: any;
  images: Array<{ url: string; thumbUrl: string; uploaderId?: string }>;
  likeCount: number;
  liked: boolean;
  repostCount: number;
  reposted: boolean;
  commentCount: number;
  latestComment?: { body: string; userId: string };
  commentsPreview: Array<{
    body: string;
    userId: string;
    user?: UserRef;
    createdAt: any;
  }>;
  reactions: Array<{ emoji: string; count: number; mine: boolean }>;
  owner?: UserRef;
}

interface CommentWithAlbumInfo {
  id: string;
  albumId: string;
  body: string;
  createdAt: any;
  albumTitle: string;
  albumThumb: string | null;
}

interface UseProfileTabsReturn {
  // Tab state
  listTab: TabType;
  setListTab: (tab: TabType) => void;

  // Stats
  stats: {
    ownCount: number;
    joinedCount: number;
    commentCount: number;
    imageCount: number;
  } | null;
  likedCount: number;

  // Data
  ownRows: AlbumRowData[];
  joinedRows: AlbumRowData[];
  likedRows: AlbumRowData[];
  userComments: CommentWithAlbumInfo[] | null;

  // Uploaded images
  uploadedPhotos: PhotoItem[] | null;
  uploadedLoading: boolean;
  uploadedError: string | null;
  uploadedErrorLink: string | null;
  uploadedHasMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;

  // Loading states
  loadingExtra: boolean;
  extraError: string | null;
  likedLoading: boolean;
  likedError: string | null;

  // Album actions
  handleToggleLike: (tabType: 'own' | 'joined' | 'liked', index: number) => Promise<void>;
  handleToggleReaction: (tabType: 'own' | 'joined' | 'liked', index: number, emoji: string) => Promise<void>;
  handleToggleRepost: (tabType: 'own' | 'joined' | 'liked', index: number) => Promise<void>;
  handleSubmitComment: (tabType: 'own' | 'joined' | 'liked', index: number, text: string) => Promise<void>;

  // Delete/Report
  deleteTargetAlbumId: string | null;
  setDeleteTargetAlbumId: (id: string | null) => void;
  deleteBusy: boolean;
  handleConfirmDelete: () => Promise<void>;
  reportTargetAlbumId: string | null;
  setReportTargetAlbumId: (id: string | null) => void;
  reportBusy: boolean;
  handleConfirmReport: () => Promise<void>;
}

// Utility functions
function escapeHtml(text: string): string {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && typeof value.seconds === 'number')
    return new Date(value.seconds * 1000);
  if (typeof value === 'number') return new Date(value > 1e12 ? value : value * 1000);
  return null;
}

function fmtDateShort(dt: Date | null): string {
  if (!dt) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/**
 * プロフィールページのタブコンテンツを管理するカスタムフック
 */
export function useProfileTabs(
  user: User | null | undefined,
  profile: { uid: string; handle?: string | null; iconURL?: string | null; displayName?: string | null } | null
): UseProfileTabsReturn {
  const { show } = useToast();
  const profileUid = profile?.uid;

  // Tab state
  const [listTab, setListTab] = useState<TabType>('own');

  // Base data
  const [ownAlbums, setOwnAlbums] = useState<any[] | null>(null);
  const [joinedAlbums, setJoinedAlbums] = useState<any[] | null>(null);
  const [userComments, setUserComments] = useState<CommentWithAlbumInfo[] | null>(null);
  const [stats, setStats] = useState<{
    ownCount: number;
    joinedCount: number;
    commentCount: number;
    imageCount: number;
  } | null>(null);

  // Album rows for timeline display
  const [ownRows, setOwnRows] = useState<AlbumRowData[]>([]);
  const [joinedRows, setJoinedRows] = useState<AlbumRowData[]>([]);
  const [likedRows, setLikedRows] = useState<AlbumRowData[]>([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [likedError, setLikedError] = useState<string | null>(null);
  const [likedCount, setLikedCount] = useState(0);
  const likedLoadedRef = useRef(false);

  // Uploaded images
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoItem[] | null>(null);
  const [uploadedLoading, setUploadedLoading] = useState(false);
  const [uploadedError, setUploadedError] = useState<string | null>(null);
  const [uploadedErrorLink, setUploadedErrorLink] = useState<string | null>(null);
  const [uploadedHasMore, setUploadedHasMore] = useState(true);
  const uploadedCursorRef = useRef<any>(null);
  const uploadedInFlightRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const albumMetaRef = useRef(new Map<string, { title: string; ownerIconURL: string | null }>());
  const ownerIconCacheRef = useRef(new Map<string, string | null>());

  // Loading states
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);

  // Delete/Report state
  const [deleteTargetAlbumId, setDeleteTargetAlbumId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [reportTargetAlbumId, setReportTargetAlbumId] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  const isMe = user && profileUid && user.uid === profileUid;

  // Helper: Build album row data
  async function buildAlbumRow(
    album: any,
    currentUserId: string | undefined,
    ownerUser?: any
  ): Promise<AlbumRowData> {
    const cache = new Map<string, any>();
    const [imgs, cmts, likeCnt, likedFlag, repostCnt, repostedFlag, reactions] = await Promise.all([
      listImages(album.id),
      listComments(album.id),
      countLikes(album.id),
      currentUserId ? hasLiked(album.id, currentUserId) : Promise.resolve(false),
      countReposts(album.id),
      currentUserId ? hasReposted(album.id, currentUserId) : Promise.resolve(false),
      listReactionsByAlbum(album.id, currentUserId || ''),
    ]);

    const cAsc = [...cmts].sort(
      (a, b) => (a.createdAt?.seconds || a.createdAt || 0) - (b.createdAt?.seconds || b.createdAt || 0)
    );
    const latest = cAsc.slice(-1)[0];
    const previewDesc = cAsc.slice(-3).reverse();
    const commentsPreview = await Promise.all(
      previewDesc.map(async (c) => {
        let cu = cache.get(c.userId);
        if (cu === undefined) {
          const u = await getUser(c.userId).catch(() => null);
          cu = u
            ? { uid: u.uid, handle: u.handle || null, iconURL: u.iconURL || null, displayName: u.displayName }
            : null;
          cache.set(c.userId, cu);
        }
        return { body: c.body, userId: c.userId, user: cu || undefined, createdAt: c.createdAt };
      })
    );

    const imgRows = (imgs || [])
      .map((x: any) => ({
        url: x.url || x.downloadUrl || '',
        thumbUrl: x.thumbUrl || x.url || x.downloadUrl || '',
        uploaderId: x.uploaderId,
      }))
      .filter((x: any) => x.url);

    const ownerRef = ownerUser
      ? {
          uid: ownerUser.uid,
          handle: ownerUser.handle || null,
          iconURL: ownerUser.iconURL || null,
          displayName: ownerUser.displayName,
        }
      : undefined;

    return {
      album,
      images: imgRows,
      likeCount: likeCnt,
      liked: !!likedFlag,
      repostCount: repostCnt,
      reposted: !!repostedFlag,
      commentCount: (cmts || []).length,
      latestComment: latest ? { body: latest.body, userId: latest.userId } : undefined,
      commentsPreview,
      reactions,
      owner: ownerRef,
    };
  }

  // Load extra info (albums, comments, stats)
  useEffect(() => {
    if (!profileUid) return;
    let active = true;

    (async () => {
      setLoadingExtra(true);
      setExtraError(null);
      try {
        const [own, joinedIds, comments, imageCount] = await Promise.all([
          listAlbumsByOwner(profileUid),
          listAlbumIdsByUploader(profileUid),
          listCommentsByUser(profileUid, 50),
          countImagesByUploader(profileUid),
        ]);
        const filteredIds = joinedIds.filter((id) => !own.some((a) => a.id === id));
        const joined = await Promise.all(filteredIds.map((id) => getAlbum(id)));

        // コメントにアルバム情報を付与
        const commentsWithAlbumInfo = await Promise.all(
          comments.map(async (c) => {
            try {
              const album = await getAlbum(c.albumId);
              return {
                ...c,
                albumTitle: album?.title || '（タイトルなし）',
                albumThumb: album?.coverImageURL || null,
              };
            } catch {
              return { ...c, albumTitle: '（不明なアルバム）', albumThumb: null };
            }
          })
        );

        if (active) {
          setOwnAlbums(own);
          setJoinedAlbums(joined.filter((a) => !!a));
          setUserComments(commentsWithAlbumInfo as CommentWithAlbumInfo[]);
          setStats({
            ownCount: own.length,
            joinedCount: filteredIds.length,
            commentCount: comments.length,
            imageCount,
          });
          // profile が変わったら投稿画像タブは未ロード状態に戻す
          setUploadedPhotos(null);
          setUploadedError(null);
          setUploadedErrorLink(null);
          setUploadedHasMore(true);
          uploadedCursorRef.current = null;
          uploadedInFlightRef.current = false;
          albumMetaRef.current = new Map();
          ownerIconCacheRef.current = new Map();
        }
      } catch (e: any) {
        if (active) setExtraError(translateError(e));
      } finally {
        if (active) setLoadingExtra(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [profileUid]);

  // Build own rows
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!ownAlbums || !profile) {
          if (!cancelled) setOwnRows([]);
          return;
        }
        const ownerRef: UserRef = {
          uid: profile.uid,
          handle: profile.handle ?? null,
          iconURL: profile.iconURL ?? null,
          displayName: profile.displayName ?? undefined,
        };
        const rows = await Promise.all(
          ownAlbums.map(async (album) => {
            const row = await buildAlbumRow(album, user?.uid, ownerRef);
            return row;
          })
        );
        if (!cancelled) setOwnRows(rows);
      } catch (e) {
        if (!cancelled) setOwnRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownAlbums, user?.uid, profile]);

  // Build joined rows
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!joinedAlbums) {
          if (!cancelled) setJoinedRows([]);
          return;
        }
        const rows = await Promise.all(
          joinedAlbums.map(async (album) => {
            const ownerUser = await getUser(album.ownerId).catch(() => null);
            return buildAlbumRow(album, user?.uid, ownerUser);
          })
        );
        if (!cancelled) setJoinedRows(rows);
      } catch (e) {
        if (!cancelled) setJoinedRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [joinedAlbums, user?.uid]);

  // Load liked albums count (自分のみ、タブ選択前に件数だけ取得)
  useEffect(() => {
    if (!profileUid || !user?.uid) return;
    if (profileUid !== user.uid) return; // 自分のプロフィールでのみ

    let cancelled = false;
    (async () => {
      try {
        const albumIds = await listLikedAlbumIdsByUser(user.uid, 100);
        if (!cancelled) setLikedCount(albumIds.length);
      } catch (e) {
        // エラーは無視
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUid, user?.uid]);

  // Load liked albums when likes tab is opened (自分のみ)
  useEffect(() => {
    if (!profileUid || !user?.uid) return;
    if (profileUid !== user.uid) return;
    if (listTab !== 'likes') return;
    if (likedLoadedRef.current) return;

    let cancelled = false;
    (async () => {
      setLikedLoading(true);
      setLikedError(null);
      try {
        const albumIds = await listLikedAlbumIdsByUser(user.uid, 100);
        const albums = (
          await Promise.all(albumIds.map((id) => getAlbum(id).catch(() => null)))
        ).filter(Boolean);

        const rows = await Promise.all(
          albums.map(async (album: any) => {
            const ownerUser = await getUser(album.ownerId).catch(() => null);
            return buildAlbumRow(album, user.uid, ownerUser);
          })
        );

        if (!cancelled) {
          setLikedRows(rows);
          setLikedCount(rows.length);
          likedLoadedRef.current = true;
        }
      } catch (e: any) {
        if (!cancelled) setLikedError(translateError(e));
      } finally {
        if (!cancelled) setLikedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUid, user?.uid, listTab]);

  // Helper: ensure album meta for images tab
  async function ensureAlbumMeta(albumIds: string[]) {
    const missing = albumIds.filter((id) => id && !albumMetaRef.current.has(id));
    if (missing.length === 0) return;
    await Promise.all(
      missing.map(async (albumId) => {
        try {
          const a: any = await getAlbum(albumId);
          const title = (a?.title || '無題') as string;
          const ownerId = (a?.ownerId || '') as string;
          let ownerIconURL: string | null = null;
          if (ownerId) {
            if (ownerIconCacheRef.current.has(ownerId)) {
              ownerIconURL = ownerIconCacheRef.current.get(ownerId) ?? null;
            } else {
              try {
                const ou: any = await getUser(ownerId);
                ownerIconURL = (ou?.iconURL || null) as string | null;
              } catch {
                ownerIconURL = null;
              }
              ownerIconCacheRef.current.set(ownerId, ownerIconURL);
            }
          }
          albumMetaRef.current.set(albumId, { title, ownerIconURL });
        } catch {
          albumMetaRef.current.set(albumId, { title: '無題', ownerIconURL: null });
        }
      })
    );
  }

  // Load more uploaded images
  const loadMoreUploaded = useCallback(
    async (reset: boolean) => {
      if (!profileUid) return;
      if (uploadedInFlightRef.current) return;
      if (!reset && !uploadedHasMore) return;

      uploadedInFlightRef.current = true;
      setUploadedLoading(true);
      setUploadedError(null);
      setUploadedErrorLink(null);

      try {
        if (reset) {
          uploadedCursorRef.current = null;
          setUploadedHasMore(true);
          setUploadedPhotos([]);
        }

        const pageSize = 48;
        const res = await Promise.race([
          listImagesByUploaderPage(profileUid, pageSize, uploadedCursorRef.current),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), 12000)
          ),
        ]);

        const rows = res?.items || [];
        const albumIds = Array.from(new Set(rows.map((x: any) => x?.albumId).filter(Boolean)));
        await ensureAlbumMeta(albumIds as string[]);

        const newPhotos: PhotoItem[] = rows
          .map((x: any, idx: number) => {
            const src = x.url || x.downloadUrl;
            if (!src) return null;
            const thumbSrc = x.thumbUrl || x.thumb || x.url || x.downloadUrl;
            const albumId = x.albumId as string | undefined;
            const meta = albumId ? albumMetaRef.current.get(albumId) : undefined;
            const title = meta?.title || '無題';
            const ownerIconURL = meta?.ownerIconURL || null;
            const dateText = fmtDateShort(toDate(x.createdAt));

            const safeTitle = escapeHtml(title);
            const safeAlbumId = albumId ? encodeURIComponent(String(albumId)) : '';
            const safeOwnerIconURL = ownerIconURL ? escapeHtml(ownerIconURL) : '';

            const subHtml = albumId
              ? `<span class="inline-flex items-center gap-2">${
                  ownerIconURL
                    ? `<img src="${safeOwnerIconURL}" alt="" class="h-6 w-6 rounded-full object-cover" loading="lazy" />`
                    : ''
                }<a href="/album/${safeAlbumId}" class="link-accent">${safeTitle}</a>${
                  dateText
                    ? ` <span class="text-xs text-muted/80">${escapeHtml(dateText)}</span>`
                    : ''
                }</span>`
              : undefined;

            return {
              id: x.id ?? `${src}:${idx}`,
              src,
              thumbSrc,
              width: 1,
              height: 1,
              subHtml,
              uploaderId: x.uploaderId,
            } satisfies PhotoItem;
          })
          .filter(Boolean) as PhotoItem[];

        setUploadedPhotos((prev) => {
          const base = reset ? [] : prev || [];
          const merged = [...base, ...newPhotos];
          const seen = new Set<string>();
          const unique: PhotoItem[] = [];
          for (const p of merged) {
            const key = (p.id ?? p.src) as string;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(p);
          }
          return unique;
        });

        uploadedCursorRef.current = res?.nextCursor || null;
        setUploadedHasMore(!!res?.hasMore && !!res?.nextCursor);
      } catch (e: any) {
        const isTimeout = e && (e.message === 'TIMEOUT' || e.code === 'deadline-exceeded');
        const isIndexMissing = e?.code === 'failed-precondition';
        const rawMessage = typeof e?.message === 'string' ? e.message : '';
        const match = rawMessage.match(/https:\/\/console\.firebase\.google\.com\/[^\s)]+/);
        const indexUrl = match?.[0] || null;

        const msg = isTimeout
          ? '投稿画像の取得に時間がかかっています。しばらく待ってから再度お試しください。'
          : isIndexMissing
          ? 'Firestore のインデックスが不足しています。下のリンクから作成してください。'
          : translateError(e);

        setUploadedError(msg);
        if (isIndexMissing && indexUrl) setUploadedErrorLink(indexUrl);
        setUploadedHasMore(false);
        if (reset) setUploadedPhotos([]);
      } finally {
        setUploadedLoading(false);
        uploadedInFlightRef.current = false;
      }
    },
    [profileUid, uploadedHasMore]
  );

  // Initial load when images tab opens
  useEffect(() => {
    if (!profileUid) return;
    if (listTab !== 'images') return;
    if (uploadedPhotos !== null) return;
    let cancelled = false;
    (async () => {
      await loadMoreUploaded(true);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUid, listTab, uploadedPhotos, loadMoreUploaded]);

  // Infinite load by IntersectionObserver
  useEffect(() => {
    if (listTab !== 'images') return;
    if (!uploadedHasMore) return;
    if (uploadedLoading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMoreUploaded(false);
        }
      },
      { root: null, rootMargin: '300px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [listTab, uploadedHasMore, uploadedLoading, loadMoreUploaded]);

  // Generic toggle like handler
  const handleToggleLike = useCallback(
    async (tabType: 'own' | 'joined' | 'liked', index: number) => {
      if (!user) return;
      const rows = tabType === 'own' ? ownRows : tabType === 'joined' ? joinedRows : likedRows;
      const setRows =
        tabType === 'own' ? setOwnRows : tabType === 'joined' ? setJoinedRows : setLikedRows;
      const albumId = rows[index]?.album?.id;
      if (!albumId) return;

      // Optimistic update
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[index] };
        row.liked = !row.liked;
        row.likeCount = row.liked ? row.likeCount + 1 : row.likeCount - 1;
        next[index] = row;
        return next;
      });

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/likes/toggle', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId: user.uid }),
        });
        if (!res.ok) {
          await toggleLike(albumId, user.uid);
        }
      } catch {
        // Rollback
        setRows((prev) => {
          const next = [...prev];
          const row = { ...next[index] };
          row.liked = !row.liked;
          row.likeCount = row.liked ? row.likeCount + 1 : row.likeCount - 1;
          next[index] = row;
          return next;
        });
      }
    },
    [user, ownRows, joinedRows, likedRows]
  );

  // Generic toggle reaction handler
  const handleToggleReaction = useCallback(
    async (tabType: 'own' | 'joined' | 'liked', index: number, emoji: string) => {
      if (!user) return;
      const rows = tabType === 'own' ? ownRows : tabType === 'joined' ? joinedRows : likedRows;
      const setRows =
        tabType === 'own' ? setOwnRows : tabType === 'joined' ? setJoinedRows : setLikedRows;
      const albumId = rows[index]?.album?.id;
      if (!albumId) return;

      // Optimistic update
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[index] };
        const list = row.reactions.slice();
        const idx = list.findIndex((x: any) => x.emoji === emoji);
        if (idx >= 0) {
          const item = { ...list[idx] };
          if (item.mine) {
            item.mine = false;
            item.count = Math.max(0, item.count - 1);
          } else {
            item.mine = true;
            item.count += 1;
          }
          list[idx] = item;
        } else {
          list.push({ emoji, count: 1, mine: true });
        }
        row.reactions = list;
        next[index] = row;
        return next;
      });

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/reactions/toggle', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId: user.uid, emoji }),
        });
        let added = false;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          added = !!data?.added;
        } else {
          const result = await toggleReaction(albumId, user.uid, emoji);
          added = !!(result as any)?.added;
        }
        const row = rows[index];
        if (added && row && row.album.ownerId !== user.uid) {
          addNotification({
            userId: row.album.ownerId,
            actorId: user.uid,
            type: 'reaction',
            albumId,
            message: 'アルバムにリアクション: ' + emoji,
          }).catch(() => {});
        }
      } catch {
        // Rollback
        setRows((prev) => {
          const next = [...prev];
          const row = { ...next[index] };
          const list = row.reactions.slice();
          const idx = list.findIndex((x: any) => x.emoji === emoji);
          if (idx >= 0) {
            const item = { ...list[idx] };
            if (item.mine) {
              item.mine = false;
              item.count = Math.max(0, item.count - 1);
            } else {
              item.mine = true;
              item.count += 1;
            }
            list[idx] = item;
          }
          row.reactions = list;
          next[index] = row;
          return next;
        });
      }
    },
    [user, ownRows, joinedRows, likedRows]
  );

  // Generic toggle repost handler
  const handleToggleRepost = useCallback(
    async (tabType: 'own' | 'joined' | 'liked', index: number) => {
      if (!user) return;
      const rows = tabType === 'own' ? ownRows : tabType === 'joined' ? joinedRows : likedRows;
      const setRows =
        tabType === 'own' ? setOwnRows : tabType === 'joined' ? setJoinedRows : setLikedRows;
      const albumId = rows[index]?.album?.id;
      if (!albumId) return;

      // Optimistic update
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[index] };
        row.reposted = !row.reposted;
        row.repostCount = row.reposted ? row.repostCount + 1 : row.repostCount - 1;
        next[index] = row;
        return next;
      });

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/reposts/toggle', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId: user.uid }),
        });
        if (!res.ok) {
          await toggleRepost(albumId, user.uid);
        }
      } catch {
        // Rollback
        setRows((prev) => {
          const next = [...prev];
          const row = { ...next[index] };
          row.reposted = !row.reposted;
          row.repostCount = row.reposted ? row.repostCount + 1 : row.repostCount - 1;
          next[index] = row;
          return next;
        });
      }
    },
    [user, ownRows, joinedRows, likedRows]
  );

  // Generic submit comment handler
  const handleSubmitComment = useCallback(
    async (tabType: 'own' | 'joined' | 'liked', index: number, text: string) => {
      if (!user) return;
      const rows = tabType === 'own' ? ownRows : tabType === 'joined' ? joinedRows : likedRows;
      const albumId = rows[index]?.album?.id;
      if (!albumId) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/comments/add', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId: user.uid, body: text }),
        });
        if (!res.ok) {
          await addComment(albumId, user.uid, text);
        }
      } catch {
        await addComment(albumId, user.uid, text);
      }
    },
    [user, ownRows, joinedRows, likedRows]
  );

  // Delete album handler
  const handleConfirmDelete = useCallback(async () => {
    const albumId = deleteTargetAlbumId;
    if (!albumId || !user?.uid) return;
    setDeleteBusy(true);
    try {
      await deleteAlbum(albumId);
      setOwnRows((prev) => prev.filter((r) => r.album.id !== albumId));
      setJoinedRows((prev) => prev.filter((r) => r.album.id !== albumId));
      setDeleteTargetAlbumId(null);
    } catch (e: any) {
      const msg = translateError(e);
      show({ message: msg, variant: 'error' });
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteTargetAlbumId, user?.uid, show]);

  // Report album handler
  const handleConfirmReport = useCallback(async () => {
    const albumId = reportTargetAlbumId;
    if (!albumId || !user) return;
    setReportBusy(true);
    try {
      const token = await user.getIdToken();
      const albumUrl = `${window.location.origin}/album/${encodeURIComponent(albumId)}`;
      const res = await fetch('/api/reports/album', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ albumId, albumUrl }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({} as any));
        const err = (json as any)?.error || 'REPORT_FAILED';
        const hint = (json as any)?.hint as string | undefined;
        const missingEnv = (json as any)?.missingEnv as string | undefined;
        let msg = err;
        if (typeof err === 'string' && err.startsWith('MISSING_ENV:')) {
          msg = `通報メール送信の設定が未完了です（${missingEnv || err.slice('MISSING_ENV:'.length)}）`;
        }
        if (hint) msg = `${msg} / ${hint}`;
        throw new Error(msg);
      }
      setReportTargetAlbumId(null);
    } catch (e: any) {
      const msg = translateError(e);
      show({ message: msg, variant: 'error' });
    } finally {
      setReportBusy(false);
    }
  }, [reportTargetAlbumId, user, show]);

  return {
    listTab,
    setListTab,
    stats,
    likedCount,
    ownRows,
    joinedRows,
    likedRows,
    userComments,
    uploadedPhotos,
    uploadedLoading,
    uploadedError,
    uploadedErrorLink,
    uploadedHasMore,
    sentinelRef,
    loadingExtra,
    extraError,
    likedLoading,
    likedError,
    handleToggleLike,
    handleToggleReaction,
    handleToggleRepost,
    handleSubmitComment,
    deleteTargetAlbumId,
    setDeleteTargetAlbumId,
    deleteBusy,
    handleConfirmDelete,
    reportTargetAlbumId,
    setReportTargetAlbumId,
    reportBusy,
    handleConfirmReport,
  };
}

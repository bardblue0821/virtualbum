"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { getAlbum } from '@/lib/repos/albumRepo';
import { listImagesByUploaderPage } from '@/lib/repos/imageRepo';
import { getUser } from '@/lib/repos/userRepo';
import { translateError } from '@/lib/errors';
import type { PhotoItem } from '@/components/gallery/GalleryGrid';

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

interface UseUploadedImagesProps {
  profileUid: string | undefined;
  isTabActive: boolean; // 'images' タブが選択されているか
}

interface UseUploadedImagesReturn {
  uploadedPhotos: PhotoItem[] | null;
  uploadedLoading: boolean;
  uploadedError: string | null;
  uploadedErrorLink: string | null;
  uploadedHasMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  resetUploaded: () => void;
}

/**
 * 投稿画像の無限スクロールを管理するフック
 */
export function useUploadedImages({
  profileUid,
  isTabActive,
}: UseUploadedImagesProps): UseUploadedImagesReturn {
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

  // Helper: ensure album meta for images
  const ensureAlbumMeta = useCallback(async (albumIds: string[]) => {
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
  }, []);

  // Reset state when profile changes
  const resetUploaded = useCallback(() => {
    setUploadedPhotos(null);
    setUploadedError(null);
    setUploadedErrorLink(null);
    setUploadedHasMore(true);
    uploadedCursorRef.current = null;
    uploadedInFlightRef.current = false;
    albumMetaRef.current = new Map();
    ownerIconCacheRef.current = new Map();
  }, []);

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
    [profileUid, uploadedHasMore, ensureAlbumMeta]
  );

  // Initial load when images tab opens
  useEffect(() => {
    if (!profileUid) return;
    if (!isTabActive) return;
    if (uploadedPhotos !== null) return;

    let cancelled = false;
    (async () => {
      await loadMoreUploaded(true);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUid, isTabActive, uploadedPhotos, loadMoreUploaded]);

  // Infinite load by IntersectionObserver
  useEffect(() => {
    if (!isTabActive) return;
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
  }, [isTabActive, uploadedHasMore, uploadedLoading, loadMoreUploaded]);

  return {
    uploadedPhotos,
    uploadedLoading,
    uploadedError,
    uploadedErrorLink,
    uploadedHasMore,
    sentinelRef,
    resetUploaded,
  };
}

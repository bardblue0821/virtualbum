"use client";
import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { listAlbumsByOwner, getAlbum } from '@/lib/db/repositories/album.repository';
import { listAlbumIdsByUploader, countImagesByUploader } from '@/lib/db/repositories/image.repository';
import { listCommentsByUser, listComments } from '@/lib/db/repositories/comment.repository';
import { countLikes, hasLiked, listLikedAlbumIdsByUser } from '@/lib/db/repositories/like.repository';
import { countReposts, hasReposted } from '@/lib/db/repositories/repost.repository';
import { listReactionsByAlbum } from '@/lib/db/repositories/reaction.repository';
import { listImages } from '@/lib/db/repositories/image.repository';
import { getUser } from '@/lib/db/repositories/user.repository';
import { translateError } from '@/lib/errors';

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

export interface CommentWithAlbumInfo {
  id: string;
  albumId: string;
  body: string;
  createdAt: any;
  albumTitle: string;
  albumThumb: string | null;
}

export interface ProfileStats {
  ownCount: number;
  joinedCount: number;
  commentCount: number;
  imageCount: number;
}

interface ProfileData {
  uid: string;
  handle?: string | null;
  iconURL?: string | null;
  displayName?: string | null;
}

interface UseAlbumRowsProps {
  user: User | null | undefined;
  profile: ProfileData | null;
}

interface UseAlbumRowsReturn {
  // Stats
  stats: ProfileStats | null;
  likedCount: number;

  // Data
  ownRows: AlbumRowData[];
  joinedRows: AlbumRowData[];
  likedRows: AlbumRowData[];
  userComments: CommentWithAlbumInfo[] | null;

  // Setters (for actions)
  setOwnRows: React.Dispatch<React.SetStateAction<AlbumRowData[]>>;
  setJoinedRows: React.Dispatch<React.SetStateAction<AlbumRowData[]>>;
  setLikedRows: React.Dispatch<React.SetStateAction<AlbumRowData[]>>;

  // Loading states
  loadingExtra: boolean;
  extraError: string | null;
  likedLoading: boolean;
  likedError: string | null;

  // Liked tab trigger
  loadLikedAlbums: () => void;
}

/**
 * Build a single album row with all associated data
 */
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

/**
 * アルバム行データの構築と管理を行うフック
 */
export function useAlbumRows({ user, profile }: UseAlbumRowsProps): UseAlbumRowsReturn {
  const profileUid = profile?.uid;

  // Base data
  const [ownAlbums, setOwnAlbums] = useState<any[] | null>(null);
  const [joinedAlbums, setJoinedAlbums] = useState<any[] | null>(null);
  const [userComments, setUserComments] = useState<CommentWithAlbumInfo[] | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);

  // Album rows for display
  const [ownRows, setOwnRows] = useState<AlbumRowData[]>([]);
  const [joinedRows, setJoinedRows] = useState<AlbumRowData[]>([]);
  const [likedRows, setLikedRows] = useState<AlbumRowData[]>([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [likedError, setLikedError] = useState<string | null>(null);
  const [likedCount, setLikedCount] = useState(0);
  const likedLoadedRef = useRef(false);

  // Loading states
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);

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
          // プロフィールが変わったらlikedをリセット
          likedLoadedRef.current = false;
          setLikedRows([]);
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
      } catch {
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
      } catch {
        if (!cancelled) setJoinedRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [joinedAlbums, user?.uid]);

  // Load liked albums count (自分のみ)
  useEffect(() => {
    if (!profileUid || !user?.uid) return;
    if (profileUid !== user.uid) return;

    let cancelled = false;
    (async () => {
      try {
        const albumIds = await listLikedAlbumIdsByUser(user.uid, 100);
        if (!cancelled) setLikedCount(albumIds.length);
      } catch {
        // エラーは無視
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUid, user?.uid]);

  // Load liked albums (triggered manually)
  const loadLikedAlbums = () => {
    if (!profileUid || !user?.uid) return;
    if (profileUid !== user.uid) return;
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
  };

  return {
    stats,
    likedCount,
    ownRows,
    joinedRows,
    likedRows,
    userComments,
    setOwnRows,
    setJoinedRows,
    setLikedRows,
    loadingExtra,
    extraError,
    likedLoading,
    likedError,
    loadLikedAlbums,
  };
}

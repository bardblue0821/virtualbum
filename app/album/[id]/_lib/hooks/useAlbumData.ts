"use client";
import { useState, useEffect} from "react";
import { translateError } from "@/lib/errors";
import { getAlbumDetailVM } from "@/src/services/album/getAlbumDetail";
import { subscribeComments } from "@/lib/repos/commentRepo";
import { batchGetUsers } from "@/lib/utils/batchQuery";
import { getMutedUserIds } from "@/lib/repos/muteRepo";
import type { UserRef } from "@/src/models/album";
import type { ImageRecord } from "../types/album.types";

type FirestoreTimestamp = {
  seconds?: number;
  nanoseconds?: number;
} | Date | number | null | undefined;

function getTimestampMillis(ts: FirestoreTimestamp): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object' && 'seconds' in ts) {
    return (ts.seconds ?? 0) * 1000;
  }
  return 0;
}

export type AlbumRecord = {
  id: string;
  ownerId: string;
  title?: string;
  placeUrl?: string;
  visibility?: 'public' | 'friends';
  [key: string]: any;
};

export type CommentRecord = {
  id: string;
  body: string;
  userId: string;
  createdAt?: FirestoreTimestamp;
  [key: string]: any;
};

export type ReactionItem = {
  emoji: string;
  count: number;
  mine: boolean;
};

export type UploaderInfo = {
  iconURL: string | null;
  handle: string | null;
};

export interface UseAlbumDataResult {
  album: AlbumRecord | null;
  setAlbum: React.Dispatch<React.SetStateAction<AlbumRecord | null>>;
  images: ImageRecord[];
  setImages: React.Dispatch<React.SetStateAction<ImageRecord[]>>;
  comments: CommentRecord[];
  setComments: React.Dispatch<React.SetStateAction<CommentRecord[]>>;
  reactions: ReactionItem[];
  setReactions: React.Dispatch<React.SetStateAction<ReactionItem[]>>;
  uploaderMap: Record<string, UploaderInfo>;
  loading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useAlbumData(
  albumId: string | undefined,
  userId: string | undefined
): UseAlbumDataResult {
  const [album, setAlbum] = useState<AlbumRecord | null>(null);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [uploaderMap, setUploaderMap] = useState<Record<string, UploaderInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // アルバムデータの読み込み
  useEffect(() => {
    if (!albumId) return;

    let cancelled = false;
    let unsubComments: (() => void) | undefined;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[AlbumDetail] Loading album:', albumId, 'user:', userId);
        const userCache = new Map<string, UserRef | null>();
        const vm = await getAlbumDetailVM(albumId, userId, userCache);
        console.log('[AlbumDetail] VM result:', vm ? 'found' : 'null', vm);
        
        if (!vm) {
          if (!cancelled) {
            setAlbum(null);
            setImages([]);
            setComments([]);
            setError("アルバムが見つかりません");
          }
          return;
        }
        
        if (cancelled) return;
        
        // ミュートユーザーIDを取得
        let mutedSet = new Set<string>();
        if (userId) {
          try {
            const mutedIds = await getMutedUserIds(userId);
            mutedSet = new Set(mutedIds);
          } catch (e) {
            console.warn('Failed to get muted user ids', e);
          }
        }

        setAlbum(vm.album as AlbumRecord);
        setImages(vm.images as ImageRecord[]);
        // ミュートユーザーのコメントを除外
        const filteredComments = (vm.commentsAsc as CommentRecord[]).filter(
          (c) => !mutedSet.has(c.userId)
        );
        setComments(filteredComments);
        setReactions(vm.reactions);

        // コメントのリアルタイム購読
        unsubComments = await subscribeComments(
          albumId,
          (snapshotList: unknown[]) => {
            if (cancelled) return;
            const list = snapshotList
              .filter((c: any) => !mutedSet.has(c.userId))
              .sort((a: any, b: any) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt));
            setComments(list as CommentRecord[]);
          },
          (err: unknown) => {
            const error = err instanceof Error ? err : new Error(String(err));
            console.warn("comments subscribe error", error);
          },
        );
      } catch (e: unknown) {
        if (!cancelled) {
          const error = e instanceof Error ? e : new Error(String(e));
          setError(translateError(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (unsubComments) unsubComments();
    };
  }, [albumId, userId]);

  // 投稿者アイコンの取得（バッチクエリで一括取得）
  useEffect(() => {
    const ids = Array.from(new Set(images.map((img) => img.uploaderId).filter(Boolean)));
    if (ids.length === 0) return;
    
    let cancelled = false;
    
    (async () => {
      try {
        const batchedUsers = await batchGetUsers(ids);
        const next: Record<string, UploaderInfo> = {};
        
        ids.forEach((uid) => {
          const u = batchedUsers.get(uid);
          next[uid] = { 
            iconURL: u?.iconURL || null, 
            handle: u?.handle || null 
          };
        });
        
        if (!cancelled) setUploaderMap(next);
      } catch (e) {
        console.warn('Failed to batch get uploaders', e);
        if (!cancelled) setUploaderMap({});
      }
    })();
    
    return () => { cancelled = true; };
  }, [images]);

  return {
    album,
    setAlbum,
    images,
    setImages,
    comments,
    setComments,
    reactions,
    setReactions,
    uploaderMap,
    loading,
    error,
    setError,
  };
}

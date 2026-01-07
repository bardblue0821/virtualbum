"use client";
import { useState, useEffect, useCallback } from "react";
import { translateError } from "@/lib/errors";
import { toggleLike, hasLiked, countLikes, subscribeLikes } from "@/lib/repos/likeRepo";

export interface UseLikesResult {
  likeCount: number;
  liked: boolean;
  likeBusy: boolean;
  handleToggleLike: () => Promise<void>;
}

export function useLikes(
  albumId: string | undefined,
  userId: string | undefined,
  setError: (error: string | null) => void
): UseLikesResult {
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    if (!albumId) return;

    let cancelled = false;
    let unsubLikes: (() => void) | undefined;

    (async () => {
      try {
        // 初期値はクエリで即時反映
        const cnt = await countLikes(albumId);
        if (!cancelled) setLikeCount(cnt);
        if (userId) {
          const likedFlag = await hasLiked(albumId, userId);
          if (!cancelled) setLiked(likedFlag);
        } else {
          if (!cancelled) setLiked(false);
        }
      } catch (e: any) {
        if (!cancelled) setError(translateError(e));
      }
      
      // リアルタイム購読で常に同期
      try {
        unsubLikes = await subscribeLikes(
          albumId,
          (list) => {
            const cnt2 = list.length;
            const meLiked = !!(userId && list.some(x => x.userId === userId));
            setLikeCount(cnt2);
            setLiked(meLiked);
          },
          (err) => console.warn("likes subscribe error", err)
        );
      } catch (e) {
        console.warn('subscribeLikes failed', e);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubLikes) try { unsubLikes(); } catch {}
    };
  }, [albumId, userId, setError]);

  const handleToggleLike = useCallback(async () => {
    if (!userId || !albumId) return;
    
    setLikeBusy(true);
    const prevLiked = liked;
    const prevCount = likeCount;
    
    // 楽観更新
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    
    try {
      const token = await (window as any).__getIdToken?.();
      if (token) {
        const res = await fetch('/api/likes/toggle', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId }),
        });
        if (!res.ok) {
          await toggleLike(albumId, userId);
        }
      } else {
        await toggleLike(albumId, userId);
      }
    } catch (e: any) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      setError(translateError(e));
    } finally {
      setLikeBusy(false);
    }
  }, [albumId, userId, liked, likeCount, setError]);

  return {
    likeCount,
    liked,
    likeBusy,
    handleToggleLike,
  };
}

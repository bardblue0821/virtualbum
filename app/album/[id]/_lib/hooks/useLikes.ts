"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
  setError: (error: string | null) => void,
  getIdToken?: () => Promise<string>
): UseLikesResult {
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!albumId) return;

    cancelledRef.current = false;
    let unsubLikes: (() => void) | undefined;

    (async () => {
      try {
        // 初期値はクエリで即時反映
        const cnt = await countLikes(albumId);
        if (!cancelledRef.current) setLikeCount(cnt);
        if (userId) {
          const likedFlag = await hasLiked(albumId, userId);
          if (!cancelledRef.current) setLiked(likedFlag);
        } else {
          if (!cancelledRef.current) setLiked(false);
        }
      } catch (e: unknown) {
        if (!cancelledRef.current) {
          const error = e instanceof Error ? e : new Error(String(e));
          setError(translateError(error));
        }
      }
      
      // リアルタイム購読で常に同期
      try {
        unsubLikes = await subscribeLikes(
          albumId,
          (list) => {
            const cnt2 = list.length;
            const meLiked = !!(userId && list.some(x => x.userId === userId));
            if (!cancelledRef.current) {
              setLikeCount(cnt2);
              setLiked(meLiked);
            }
          },
          (err: unknown) => {
            const error = err instanceof Error ? err : new Error(String(err));
            console.warn("likes subscribe error", error);
          }
        );
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.warn('subscribeLikes failed', error);
      }
    })();

    return () => {
      cancelledRef.current = true;
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
      let token: string | undefined;
      if (getIdToken) {
        token = await getIdToken();
      } else {
        token = await (window as any).__getIdToken?.();
      }

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
    } catch (e: unknown) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      const error = e instanceof Error ? e : new Error(String(e));
      setError(translateError(error));
    } finally {
      setLikeBusy(false);
    }
  }, [albumId, userId, liked, likeCount, setError, getIdToken]);

  return {
    likeCount,
    liked,
    likeBusy,
    handleToggleLike,
  };
}

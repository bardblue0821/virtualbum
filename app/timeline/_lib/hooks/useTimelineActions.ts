"use client";
import { useCallback } from "react";
import { User } from "firebase/auth";
import type { TimelineItemVM, UserRef } from "@/src/models/timeline";
import { getUser } from "@/lib/repos/userRepo";
import { toggleLike } from "@/lib/repos/likeRepo";
import { toggleReaction } from "@/lib/repos/reactionRepo";
import { addNotification } from "@/lib/repos/notificationRepo";
import { toggleRepost } from "@/lib/repos/repostRepo";
import { addComment } from "@/lib/repos/commentRepo";
import { isRateLimitError } from "@/lib/rateLimit";
import { notifications } from "@mantine/notifications";

interface UseTimelineActionsProps {
  user: User | null | undefined;
  rows: TimelineItemVM[];
  rowsRef: React.MutableRefObject<TimelineItemVM[]>;
  setRows: React.Dispatch<React.SetStateAction<TimelineItemVM[]>>;
  updateRowByAlbumId: (albumId: string, updater: (row: TimelineItemVM) => TimelineItemVM) => void;
  resortTimeline: () => void;
  userCacheRef: React.MutableRefObject<Map<string, UserRef | null>>;
  setUndoRepostTargetAlbumId: (id: string | null) => void;
}

interface UseTimelineActionsReturn {
  handleToggleLike: (albumId: string) => Promise<void>;
  handleToggleReaction: (albumId: string, emoji: string) => void;
  handleToggleRepost: (albumId: string) => Promise<void>;
  handleSubmitComment: (albumId: string, text: string) => Promise<void>;
}

/**
 * タイムラインのアクション（いいね、リアクション、リポスト、コメント）を管理
 */
export function useTimelineActions({
  user,
  rows,
  rowsRef,
  setRows,
  updateRowByAlbumId,
  resortTimeline,
  userCacheRef,
  setUndoRepostTargetAlbumId,
}: UseTimelineActionsProps): UseTimelineActionsReturn {
  const handleToggleLike = useCallback(
    async (albumId: string) => {
      if (!user) return;
      updateRowByAlbumId(albumId, (row) => {
        const likedPrev = row.liked;
        return { ...row, liked: !likedPrev, likeCount: likedPrev ? row.likeCount - 1 : row.likeCount + 1 };
      });
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/likes/toggle", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId: user.uid }),
        });
        if (!res.ok) {
          await toggleLike(albumId, user.uid);
        }
      } catch {
        // rollback
        updateRowByAlbumId(albumId, (row) => {
          const likedNow = !row.liked;
          return { ...row, liked: likedNow, likeCount: likedNow ? row.likeCount + 1 : row.likeCount - 1 };
        });
      }
    },
    [user, updateRowByAlbumId]
  );

  const handleToggleReaction = useCallback(
    (albumId: string, emoji: string) => {
      if (!user) return;
      // optimistic update
      updateRowByAlbumId(albumId, (row) => {
        const list = row.reactions.slice();
        const idx = list.findIndex((x) => x.emoji === emoji);
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
        return { ...row, reactions: list };
      });

      (async () => {
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/reactions/toggle", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
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
          const row = rowsRef.current.find((r) => r.album.id === albumId);
          if (added && row && row.album.ownerId !== user.uid) {
            addNotification({
              userId: row.album.ownerId,
              actorId: user.uid,
              type: "reaction",
              albumId,
              message: "アルバムにリアクション: " + emoji,
            }).catch(() => {});
          }
        } catch (e: any) {
          // rollback
          updateRowByAlbumId(albumId, (row) => {
            const list = row.reactions.slice();
            const idx = list.findIndex((x) => x.emoji === emoji);
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
            return { ...row, reactions: list };
          });
          if (isRateLimitError(e)) {
            notifications.show({ message: e.message, color: "red" });
          }
        }
      })();
    },
    [user, rowsRef, updateRowByAlbumId]
  );

  const handleToggleRepost = useCallback(
    async (albumId: string) => {
      if (!user) return;
      const row = rowsRef.current.find((r) => r.album.id === albumId);
      const currentlyReposted = !!row?.reposted;

      if (currentlyReposted) {
        setUndoRepostTargetAlbumId(albumId);
        return;
      }

      // optimistic update
      setRows((prev) => {
        const bumped = prev.map((r) =>
          r.album.id === albumId ? ({ ...r, reposted: true, repostCount: (r.repostCount || 0) + 1 } as any) : r
        );
        if (!row) return bumped;
        const newCreatedAt = new Date();
        const newRow: TimelineItemVM = {
          ...row,
          reposted: true,
          repostCount: (row.repostCount || 0) + 1,
          repostedBy: { userId: user.uid, createdAt: newCreatedAt },
          imageAdded: undefined,
        } as any;
        return [newRow, ...bumped];
      });
      resortTimeline();

      // enrich user info
      (async () => {
        try {
          let cu = userCacheRef.current.get(user.uid);
          if (cu === undefined) {
            const u = await getUser(user.uid);
            cu = u
              ? { uid: u.uid, handle: u.handle || null, iconURL: u.iconURL || null, displayName: u.displayName }
              : null;
            userCacheRef.current.set(user.uid, cu);
          }
          const fallbackIcon = (user as any).photoURL || undefined;
          const enriched = cu || {
            uid: user.uid,
            handle: null,
            iconURL: (fallbackIcon || null) as any,
            displayName: user.displayName || undefined,
          };
          setRows((prev) => {
            const next = [...prev];
            const idx = next.findIndex(
              (r) => r.album.id === albumId && (r.repostedBy as any)?.userId === user.uid && !(r as any).imageAdded
            );
            if (idx >= 0) {
              next[idx] = { ...next[idx], repostedBy: { ...(next[idx].repostedBy as any), user: enriched } } as any;
            }
            return next;
          });
        } catch {}
      })();

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/reposts/toggle", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId: user.uid }),
        });
        if (!res.ok) {
          await toggleRepost(albumId, user.uid);
        }
      } catch {
        // rollback
        updateRowByAlbumId(albumId, (r) => ({
          ...r,
          reposted: false,
          repostCount: Math.max(0, (r.repostCount || 0) - 1),
        }));
        resortTimeline();
      }
    },
    [user, rowsRef, setRows, resortTimeline, userCacheRef, updateRowByAlbumId, setUndoRepostTargetAlbumId]
  );

  const handleSubmitComment = useCallback(
    async (albumId: string, text: string) => {
      if (!user) return;

      const newComment = {
        body: text,
        userId: user.uid,
        user: {
          uid: user.uid,
          handle: null,
          iconURL: user.photoURL || null,
          displayName: user.displayName || "",
        },
        createdAt: new Date(),
      };

      setRows((prev) =>
        prev.map((r) => {
          if (r.album.id !== albumId) return r;
          const currentPreview = r.commentsPreview || [];
          const updatedPreview = [newComment, ...currentPreview].slice(0, 3);
          return {
            ...r,
            commentsPreview: updatedPreview,
            commentCount: (r.commentCount || 0) + 1,
          } as TimelineItemVM;
        })
      );

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/comments/add", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId: user.uid, body: text }),
        });
        if (!res.ok) {
          await addComment(albumId, user.uid, text);
        }
      } catch (e: any) {
        if (isRateLimitError(e)) {
          notifications.show({ message: e.message, color: "red" });
        } else {
          await addComment(albumId, user.uid, text);
        }
      }
    },
    [user, setRows]
  );

  return {
    handleToggleLike,
    handleToggleReaction,
    handleToggleRepost,
    handleSubmitComment,
  };
}

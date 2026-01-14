"use client";
import { useCallback } from 'react';
import { User } from 'firebase/auth';
import { toggleLike } from '@/lib/repos/likeRepo';
import { toggleReaction } from '@/lib/repos/reactionRepo';
import { toggleRepost } from '@/lib/repos/repostRepo';
import { addComment } from '@/lib/repos/commentRepo';
import { addNotification } from '@/lib/repos/notificationRepo';
import type { AlbumRowData } from './useProfileTabs';

type TabType = 'own' | 'joined' | 'liked';

interface UseAlbumActionsProps {
  user: User | null | undefined;
  ownRows: AlbumRowData[];
  joinedRows: AlbumRowData[];
  likedRows: AlbumRowData[];
  setOwnRows: React.Dispatch<React.SetStateAction<AlbumRowData[]>>;
  setJoinedRows: React.Dispatch<React.SetStateAction<AlbumRowData[]>>;
  setLikedRows: React.Dispatch<React.SetStateAction<AlbumRowData[]>>;
}

interface UseAlbumActionsReturn {
  handleToggleLike: (tabType: TabType, index: number) => Promise<void>;
  handleToggleReaction: (tabType: TabType, index: number, emoji: string) => Promise<void>;
  handleToggleRepost: (tabType: TabType, index: number) => Promise<void>;
  handleSubmitComment: (tabType: TabType, index: number, text: string) => Promise<void>;
}

/**
 * アルバムに対するアクション（いいね、リアクション、リポスト、コメント）を管理するフック
 */
export function useAlbumActions({
  user,
  ownRows,
  joinedRows,
  likedRows,
  setOwnRows,
  setJoinedRows,
  setLikedRows,
}: UseAlbumActionsProps): UseAlbumActionsReturn {
  // Helper: Get rows and setter by tab type
  const getRowsAndSetter = useCallback(
    (tabType: TabType) => {
      switch (tabType) {
        case 'own':
          return { rows: ownRows, setRows: setOwnRows };
        case 'joined':
          return { rows: joinedRows, setRows: setJoinedRows };
        case 'liked':
          return { rows: likedRows, setRows: setLikedRows };
      }
    },
    [ownRows, joinedRows, likedRows, setOwnRows, setJoinedRows, setLikedRows]
  );

  // Toggle like handler
  const handleToggleLike = useCallback(
    async (tabType: TabType, index: number) => {
      if (!user) return;
      const { rows, setRows } = getRowsAndSetter(tabType);
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
    [user, getRowsAndSetter]
  );

  // Toggle reaction handler
  const handleToggleReaction = useCallback(
    async (tabType: TabType, index: number, emoji: string) => {
      if (!user) return;
      const { rows, setRows } = getRowsAndSetter(tabType);
      const albumId = rows[index]?.album?.id;
      if (!albumId) return;

      // Optimistic update
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[index] };
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
          row.reactions = list;
          next[index] = row;
          return next;
        });
      }
    },
    [user, getRowsAndSetter]
  );

  // Toggle repost handler
  const handleToggleRepost = useCallback(
    async (tabType: TabType, index: number) => {
      if (!user) return;
      const { rows, setRows } = getRowsAndSetter(tabType);
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
    [user, getRowsAndSetter]
  );

  // Submit comment handler
  const handleSubmitComment = useCallback(
    async (tabType: TabType, index: number, text: string) => {
      if (!user) return;
      const { rows } = getRowsAndSetter(tabType);
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
    [user, getRowsAndSetter]
  );

  return {
    handleToggleLike,
    handleToggleReaction,
    handleToggleRepost,
    handleSubmitComment,
  };
}

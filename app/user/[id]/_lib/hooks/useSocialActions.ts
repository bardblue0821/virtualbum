"use client";
import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  getFriendStatus,
  sendFriendRequest,
  acceptFriend,
  cancelFriendRequest,
  removeFriend,
  listAcceptedFriends,
} from '@/lib/repos/friendRepo';
import { isWatched, addWatch, removeWatch, listWatchers } from '@/lib/repos/watchRepo';
import { translateError } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';

export type FriendState = 'none' | 'sent' | 'received' | 'accepted';

interface UseSocialActionsReturn {
  // Friend
  friendState: FriendState;
  friendBusy: boolean;
  doSendFriend: () => Promise<void>;
  doAcceptFriend: () => Promise<void>;
  doCancelFriend: () => Promise<void>;
  doRemoveFriend: () => Promise<void>;
  friendRemoveOpen: boolean;
  setFriendRemoveOpen: (open: boolean) => void;
  friendRemoveBusy: boolean;
  confirmFriendRemove: () => Promise<void>;

  // Watch
  watching: boolean;
  watchBusy: boolean;
  doToggleWatch: () => Promise<void>;

  // Block
  blocked: boolean;
  blockBusy: boolean;
  blockedByThem: boolean;
  doToggleBlock: () => Promise<void>;

  // Mute
  muted: boolean;
  muteBusy: boolean;
  doToggleMute: () => Promise<void>;

  // Social counts
  watchersCount: number;
  friendsCount: number;
  watchersIds: string[];
  friendsOtherIds: string[];

  // Error
  error: string | null;
  setError: (error: string | null) => void;
}

/**
 * ソーシャルアクション（フレンド/ウォッチ/ブロック/ミュート）を管理するカスタムフック
 */
export function useSocialActions(
  user: User | null | undefined,
  profileUid: string | null | undefined
): UseSocialActionsReturn {
  const { show } = useToast();

  // Friend state
  const [friendState, setFriendState] = useState<FriendState>('none');
  const [friendBusy, setFriendBusy] = useState(false);
  const [friendRemoveOpen, setFriendRemoveOpen] = useState(false);
  const [friendRemoveBusy, setFriendRemoveBusy] = useState(false);

  // Watch state
  const [watching, setWatching] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);

  // Block state
  const [blocked, setBlocked] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  // Mute state
  const [muted, setMuted] = useState(false);
  const [muteBusy, setMuteBusy] = useState(false);

  // Counts
  const [watchersCount, setWatchersCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [watchersIds, setWatchersIds] = useState<string[]>([]);
  const [friendsOtherIds, setFriendsOtherIds] = useState<string[]>([]);

  // Error
  const [error, setError] = useState<string | null>(null);

  const isMe = user && profileUid && user.uid === profileUid;
  const canInteract = user && profileUid && !isMe;

  // Load initial social state
  useEffect(() => {
    if (!profileUid) return;
    let active = true;

    (async () => {
      let watchedFlag = false;
      let blockedFlag = false;
      let blockedByThemFlag = false;
      let mutedFlag = false;

      if (user && profileUid !== user.uid) {
        // Friend status
        const forward = await getFriendStatus(user.uid, profileUid);
        const backward = await getFriendStatus(profileUid, user.uid);
        let st: FriendState = 'none';
        if (forward === 'accepted' || backward === 'accepted') st = 'accepted';
        else if (forward === 'pending') st = 'sent';
        else if (backward === 'pending') st = 'received';
        if (active) setFriendState(st);

        // Watch status
        watchedFlag = await isWatched(user.uid, profileUid);

        // Block status (via API)
        try {
          const token = await user.getIdToken();
          const res = await fetch(`/api/block/status?targetUserId=${profileUid}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            blockedFlag = !!data.blocked;
            blockedByThemFlag = !!data.blockedByThem;
          }
        } catch {
          // API failure: keep false
        }

        // Mute status (via API)
        try {
          const token = await user.getIdToken();
          const res = await fetch(`/api/mute/status?targetUserId=${profileUid}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            mutedFlag = !!data.muted;
          }
        } catch {
          // API failure: keep false
        }
      } else {
        if (active) setFriendState('none');
      }

      if (active) {
        setWatching(watchedFlag);
        setBlocked(blockedFlag);
        setBlockedByThem(blockedByThemFlag);
        setMuted(mutedFlag);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, profileUid]);

  // Load social counts
  useEffect(() => {
    if (!profileUid) return;
    let active = true;

    (async () => {
      let watcherIdList: string[] = [];
      let friendOtherIdList: string[] = [];

      try {
        watcherIdList = await listWatchers(profileUid);
      } catch {
        // ignore
      }

      try {
        const fdocs = await listAcceptedFriends(profileUid);
        friendOtherIdList = fdocs
          .map((fd) => (fd.userId === profileUid ? fd.targetId : fd.userId))
          .filter(Boolean);
      } catch {
        // ignore
      }

      if (active) {
        setWatchersCount(watcherIdList.length);
        setFriendsCount(friendOtherIdList.length);
        setWatchersIds(watcherIdList);
        setFriendsOtherIds(friendOtherIdList);
      }
    })();

    return () => {
      active = false;
    };
  }, [profileUid]);

  // Friend actions
  const doSendFriend = useCallback(async () => {
    if (!canInteract) return;
    setFriendBusy(true);
    setError(null);
    try {
      await sendFriendRequest(user!.uid, profileUid!);
      setFriendState('sent');
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setFriendBusy(false);
    }
  }, [canInteract, user, profileUid]);

  const doAcceptFriend = useCallback(async () => {
    if (!canInteract) return;
    setFriendBusy(true);
    setError(null);
    try {
      await acceptFriend(profileUid!, user!.uid);
      setFriendState('accepted');
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setFriendBusy(false);
    }
  }, [canInteract, user, profileUid]);

  const doCancelFriend = useCallback(async () => {
    if (!canInteract) return;
    setFriendBusy(true);
    setError(null);
    try {
      await cancelFriendRequest(user!.uid, profileUid!);
      setFriendState('none');
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setFriendBusy(false);
    }
  }, [canInteract, user, profileUid]);

  const doRemoveFriend = useCallback(async () => {
    if (!canInteract) return;
    setFriendRemoveBusy(true);
    setError(null);
    try {
      await removeFriend(user!.uid, profileUid!);
      setFriendState('none');
      setFriendRemoveOpen(false);
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setFriendRemoveBusy(false);
    }
  }, [canInteract, user, profileUid]);

  const confirmFriendRemove = useCallback(async () => {
    await doRemoveFriend();
  }, [doRemoveFriend]);

  // Watch toggle
  const doToggleWatch = useCallback(async () => {
    if (!canInteract) return;
    setWatchBusy(true);
    setError(null);
    try {
      if (watching) {
        await removeWatch(user!.uid, profileUid!);
        setWatching(false);
      } else {
        await addWatch(user!.uid, profileUid!);
        setWatching(true);
      }
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setWatchBusy(false);
    }
  }, [canInteract, user, profileUid, watching]);

  // Block toggle
  const doToggleBlock = useCallback(async () => {
    if (!canInteract) return;
    setBlockBusy(true);
    setError(null);
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/block/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: profileUid }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || 'BLOCK_FAILED');
      }
      const data = await res.json();
      setBlocked(data.blocked);
      // ブロックするとフレンドとウォッチも解除される
      if (data.blocked) {
        setFriendState('none');
        setWatching(false);
        show({ message: 'ブロックしました', variant: 'success' });
      } else {
        show({ message: 'ブロックを解除しました', variant: 'success' });
      }
    } catch (e: any) {
      setError(translateError(e));
      show({ message: e?.message || 'ブロックに失敗しました', variant: 'error' });
    } finally {
      setBlockBusy(false);
    }
  }, [canInteract, user, profileUid, show]);

  // Mute toggle
  const doToggleMute = useCallback(async () => {
    if (!canInteract) return;
    setMuteBusy(true);
    setError(null);
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/mute/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: profileUid }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || 'MUTE_FAILED');
      }
      const data = await res.json();
      setMuted(data.muted);
      if (data.muted) {
        show({ message: 'ミュートしました', variant: 'success' });
      } else {
        show({ message: 'ミュートを解除しました', variant: 'success' });
      }
    } catch (e: any) {
      setError(translateError(e));
      show({ message: e?.message || 'ミュートに失敗しました', variant: 'error' });
    } finally {
      setMuteBusy(false);
    }
  }, [canInteract, user, profileUid, show]);

  return {
    // Friend
    friendState,
    friendBusy,
    doSendFriend,
    doAcceptFriend,
    doCancelFriend,
    doRemoveFriend,
    friendRemoveOpen,
    setFriendRemoveOpen,
    friendRemoveBusy,
    confirmFriendRemove,
    // Watch
    watching,
    watchBusy,
    doToggleWatch,
    // Block
    blocked,
    blockBusy,
    blockedByThem,
    doToggleBlock,
    // Mute
    muted,
    muteBusy,
    doToggleMute,
    // Counts
    watchersCount,
    friendsCount,
    watchersIds,
    friendsOtherIds,
    // Error
    error,
    setError,
  };
}

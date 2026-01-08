import { useEffect, useState } from "react";
import { getFriendStatus } from "@/lib/repos/friendRepo";
import { isWatched } from "@/lib/repos/watchRepo";
import { isBlocking } from "@/lib/repos/blockRepo";

/**
 * 判定: 現在のユーザーがアルバムオーナーに対してフレンド/ウォッチャーかどうか。
 * また、オーナーが自分をブロックしているか、自分がオーナーをブロックしているかも判定。
 * 与えるのは ownerId と currentUserId。片方が欠けていれば false を返す。
 * 
 * 注意: blockedUsers サブコレクションは本人のみ読み取り可能なため、
 * 「オーナーが自分をブロック」の判定はクライアント側では不可。
 * 代わりに「自分がオーナーをブロック」のみ判定し、
 * オーナーによるブロックはFirestoreルール側で操作拒否する設計。
 */
export function useAlbumAccess(ownerId?: string, currentUserId?: string) {
  const [isFriend, setIsFriend] = useState(false);
  const [isWatcher, setIsWatcher] = useState(false);
  const [isBlockedByOwner, setIsBlockedByOwner] = useState(false);
  const [isBlockingOwner, setIsBlockingOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      console.log('[useAlbumAccess] checking access:', { ownerId, currentUserId });
      if (!ownerId || !currentUserId) {
        console.log('[useAlbumAccess] missing ownerId or currentUserId, skipping');
        if (!cancelled) { 
          setIsFriend(false); 
          setIsWatcher(false); 
          setIsBlockedByOwner(false);
          setIsBlockingOwner(false);
        }
        return;
      }

      // フレンド・ウォッチ判定（これらは読み取り可能）
      let friendResult = false;
      let watchResult = false;
      try {
        const [forward, backward, watched] = await Promise.all([
          getFriendStatus(currentUserId, ownerId),
          getFriendStatus(ownerId, currentUserId),
          isWatched(currentUserId, ownerId),
        ]);
        console.log('[useAlbumAccess] friend/watch results:', { forward, backward, watched });
        friendResult = (forward === 'accepted') || (backward === 'accepted');
        watchResult = !!watched;
      } catch (err) {
        console.error('[useAlbumAccess] friend/watch error:', err);
      }

      // 自分がオーナーをブロックしているか（自分のblockedUsersは読み取り可能）
      let iBlockOwnerResult = false;
      try {
        iBlockOwnerResult = await isBlocking(currentUserId, ownerId);
        console.log('[useAlbumAccess] iBlockOwner:', iBlockOwnerResult);
      } catch (err) {
        console.error('[useAlbumAccess] isBlocking(me->owner) error:', err);
      }

      // オーナーが自分をブロックしているかは読み取り不可のため、常にfalse
      // Firestoreルール側で操作が拒否される
      const ownerBlocksMeResult = false;

      if (!cancelled) {
        console.log('[useAlbumAccess] final results:', { isFriend: friendResult, isWatcher: watchResult, isBlockingOwner: iBlockOwnerResult });
        setIsFriend(friendResult);
        setIsWatcher(watchResult);
        setIsBlockedByOwner(ownerBlocksMeResult);
        setIsBlockingOwner(iBlockOwnerResult);
      }
    })();
    return () => { cancelled = true; };
  }, [ownerId, currentUserId]);

  return { isFriend, isWatcher, isBlockedByOwner, isBlockingOwner };
}

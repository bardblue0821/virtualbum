import { useEffect, useState } from "react";
import { getFriendStatus } from "@/lib/repos/friendRepo";
import { isWatched } from "@/lib/repos/watchRepo";
import { isBlocking } from "@/lib/repos/blockRepo";

/**
 * 判定: 現在のユーザーがアルバムオーナーに対してフレンド/ウォッチャーかどうか。
 * また、オーナーが自分をブロックしているか、自分がオーナーをブロックしているかも判定。
 * 与えるのは ownerId と currentUserId。片方が欠けていれば false を返す。
 */
export function useAlbumAccess(ownerId?: string, currentUserId?: string) {
  const [isFriend, setIsFriend] = useState(false);
  const [isWatcher, setIsWatcher] = useState(false);
  const [isBlockedByOwner, setIsBlockedByOwner] = useState(false);
  const [isBlockingOwner, setIsBlockingOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ownerId || !currentUserId) {
        if (!cancelled) { 
          setIsFriend(false); 
          setIsWatcher(false); 
          setIsBlockedByOwner(false);
          setIsBlockingOwner(false);
        }
        return;
      }
      try {
        const [forward, backward, watched, ownerBlocksMe, iBlockOwner] = await Promise.all([
          getFriendStatus(currentUserId, ownerId),
          getFriendStatus(ownerId, currentUserId),
          isWatched(currentUserId, ownerId),
          isBlocking(ownerId, currentUserId), // オーナーが自分をブロック
          isBlocking(currentUserId, ownerId), // 自分がオーナーをブロック
        ]);
        if (!cancelled) {
          const f = (forward === 'accepted') || (backward === 'accepted');
          setIsFriend(!!f);
          setIsWatcher(!!watched);
          setIsBlockedByOwner(ownerBlocksMe);
          setIsBlockingOwner(iBlockOwner);
        }
      } catch {
        if (!cancelled) { 
          setIsFriend(false); 
          setIsWatcher(false); 
          setIsBlockedByOwner(false);
          setIsBlockingOwner(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [ownerId, currentUserId]);

  return { isFriend, isWatcher, isBlockedByOwner, isBlockingOwner };
}

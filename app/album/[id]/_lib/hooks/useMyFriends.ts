/*ログインユーザーのフレンドIDを取得するフック*/

import { useState, useEffect } from 'react';
import { listAcceptedFriends } from '@/lib/repos/friendRepo';

export function useMyFriends(userId: string | undefined) {
  const [myFriendIds, setMyFriendIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setMyFriendIds(new Set());
      return;
    }

    let cancelled = false;
    listAcceptedFriends(userId)
      .then((docs) => {
        if (cancelled) return;
        const ids = new Set<string>();
        for (const d of docs) {
          if (d.userId === userId) ids.add(d.targetId);
          else if (d.targetId === userId) ids.add(d.userId);
        }
        setMyFriendIds(ids);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return myFriendIds;
}

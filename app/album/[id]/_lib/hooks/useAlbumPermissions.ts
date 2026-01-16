/*アルバムの権限情報を統合管理するフック*/
/*
1. オーナー判定	userId === album.ownerId
2. フレンド状態	useAlbumAccess から取得
3. ウォッチャー状態	useAlbumAccess から取得
4. ブロック判定	双方向ブロック (ByOwner || BlockingOwner)
5. プライベート判定	visibility === 'friends'
6. 権限導出	canAddImages, canPostComment
*/

import { useMemo } from 'react';
import { useAlbumAccess } from '@/src/hooks/useAlbumAccess';

interface AlbumForPermissions {
  ownerId?: string;
  visibility?: 'public' | 'friends';
}

export function useAlbumPermissions(
  album: AlbumForPermissions | null,
  userId: string | undefined
) {
  const isOwner = useMemo(
    () => !!(userId && album?.ownerId === userId),
    [userId, album?.ownerId]
  );

  const { isFriend, isWatcher, isBlockedByOwner, isBlockingOwner } = useAlbumAccess(
    album?.ownerId,
    userId
  );

  const isPrivate = album?.visibility === 'friends';
  const isBlocked = isBlockedByOwner || isBlockingOwner;

  const canAddImages = !!(userId && (isOwner || isFriend));
  const canPostComment = !!(userId && (isOwner || isFriend || (!isPrivate && isWatcher)));

  return {
    isOwner,
    isFriend,
    isWatcher,
    isPrivate,
    isBlocked,
    canAddImages,
    canPostComment,
  };
}

/**
 * アルバムの権限情報を統合管理するフック
 */

import { useMemo } from 'react';
import { useAlbumAccess } from '@/src/hooks/useAlbumAccess';

export function useAlbumPermissions(
  album: any,
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

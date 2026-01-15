/**
 * ギャラリーの削除権限チェック
 */

import { useCallback } from 'react';
import { type PhotoItem } from '@/components/gallery/GalleryGrid';

export function useGalleryPermissions(
  isOwner: boolean,
  isFriend: boolean,
  userId: string | undefined
) {
  const canDelete = useCallback(
    (photo: PhotoItem) => {
      if (isOwner) return true;
      if (isFriend) return photo.uploaderId === userId;
      return false;
    },
    [isOwner, isFriend, userId]
  );

  return { canDelete };
}

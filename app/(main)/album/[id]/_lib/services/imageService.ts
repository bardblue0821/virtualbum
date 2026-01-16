/*画像操作のサービス層*/

import type { ImageRecord } from '../types/album.types';

export function sortImagesByTimestamp(images: ImageRecord[]): ImageRecord[] {
  return [...images].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return a.createdAt.seconds - b.createdAt.seconds;
  });
}

export function filterImagesByUser(images: ImageRecord[], userId: string): ImageRecord[] {
  return images.filter((img) => img.uploaderId === userId);
}

export function calculateVisibleRange(
  totalCount: number,
  currentVisible: number,
  loadMoreCount: number
): {
  nextVisible: number;
  hasMore: boolean;
} {
  const nextVisible = currentVisible + loadMoreCount;
  return {
    nextVisible: Math.min(nextVisible, totalCount),
    hasMore: nextVisible < totalCount,
  };
}

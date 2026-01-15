/**
 * 画像操作のサービス層
 */

import type { ImageData } from '../types/album.types';

export function sortImagesByTimestamp(images: ImageData[]): ImageData[] {
  return [...images].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return a.createdAt.seconds - b.createdAt.seconds;
  });
}

export function filterImagesByUser(images: ImageData[], userId: string): ImageData[] {
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

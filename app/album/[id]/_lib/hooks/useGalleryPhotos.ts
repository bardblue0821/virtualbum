/**
 * ギャラリー表示用の写真データを生成するフック
 */

import { useMemo } from 'react';
import { type PhotoItem } from '@/components/gallery/GalleryGrid';
import type { ImageData, UploaderInfo } from '../types/album.types';

export function useGalleryPhotos(
  images: ImageData[],
  uploaderMap: Record<string, UploaderInfo>
): PhotoItem[] {
  return useMemo(() => {
    return images.map((img) => ({
      id: img.id,
      src: img.url,
      thumbSrc: img.thumbUrl || img.url,
      width: 1200,
      height: 1200,
      alt: img.id || 'image',
      uploaderId: img.uploaderId,
      uploaderIconURL: img.uploaderId
        ? uploaderMap[img.uploaderId]?.iconURL || null
        : null,
      uploaderHandle: img.uploaderId
        ? uploaderMap[img.uploaderId]?.handle || null
        : null,
      createdAt: img.createdAt,
    }));
  }, [images, uploaderMap]);
}

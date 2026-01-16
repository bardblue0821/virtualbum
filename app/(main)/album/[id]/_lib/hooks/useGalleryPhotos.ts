/*ギャラリー表示用の写真データを生成するフック*/

import { useMemo } from 'react';
import { type PhotoItem } from '@/components/gallery/GalleryGrid';
import { GALLERY_DIMENSIONS } from '../constants/album.constants';
import type { ImageRecord, UploaderInfo } from '../types/album.types';

export function useGalleryPhotos(
  images: ImageRecord[],
  uploaderMap: Record<string, UploaderInfo>
): PhotoItem[] {
  return useMemo(() => {
    return images.map((img) => ({
      id: img.id,
      src: img.url,
      thumbSrc: img.thumbUrl || img.url,
      width: GALLERY_DIMENSIONS.WIDTH,
      height: GALLERY_DIMENSIONS.HEIGHT,
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

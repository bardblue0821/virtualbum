/*画像管理モーダルと削除処理を統合するフック*/

import { useState } from 'react';
import { listImages } from '@/lib/db/repositories/image.repository';
import type { ImageRecord } from '../types/album.types';

// タイムスタンプを数値に変換
function getTimestampMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object' && 'seconds' in ts) {
    const obj = ts as { seconds?: number };
    return (obj.seconds ?? 0) * 1000;
  }
  return 0;
}

export function useImageManagement(
  albumId: string | undefined,
  userId: string | undefined,
  images: ImageRecord[],
  setImages: React.Dispatch<React.SetStateAction<ImageRecord[]>>,
  getIdToken?: () => Promise<string>
) {
  const [imageManageModalOpen, setImageManageModalOpen] = useState(false);

  const handleImageUploaded = async () => {
    if (!albumId) return;
    const imgs = await listImages(albumId);
    imgs.sort((a: unknown, b: unknown) => {
      const aTime = getTimestampMillis((a as ImageRecord).createdAt);
      const bTime = getTimestampMillis((b as ImageRecord).createdAt);
      return bTime - aTime;
    });
    setImages(imgs as ImageRecord[]);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!albumId || !userId) return;

    if (!getIdToken) {
      throw new Error('Authentication function not provided');
    }

    const token = await getIdToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/images/delete', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ albumId, userId, imageId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: unknown };
      throw new Error(data?.error instanceof Error ? data.error.message : String(data?.error || 'DELETE_FAILED'));
    }

    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const existingImages = images
    .filter((img) => img.uploaderId === userId)
    .map((img) => ({
      id: img.id,
      url: img.url,
      thumbUrl: img.thumbUrl || undefined,
      uploaderId: img.uploaderId,
    }));

  return {
    imageManageModalOpen,
    setImageManageModalOpen,
    existingImages,
    handleImageUploaded,
    handleDeleteImage,
  };
}

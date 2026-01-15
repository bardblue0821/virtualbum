/**
 * 画像管理モーダルと削除処理を統合するフック
 */

import { useState } from 'react';
import { listImages } from '@/lib/repos/imageRepo';
import type { ImageData } from '../types/album.types';

export function useImageManagement(
  albumId: string | undefined,
  userId: string | undefined,
  images: ImageData[],
  setImages: React.Dispatch<React.SetStateAction<any[]>>
) {
  const [imageManageModalOpen, setImageManageModalOpen] = useState(false);

  const handleImageUploaded = async () => {
    if (!albumId) return;
    const imgs = await listImages(albumId);
    imgs.sort(
      (a: any, b: any) =>
        (b.createdAt?.seconds || b.createdAt || 0) -
        (a.createdAt?.seconds || a.createdAt || 0)
    );
    setImages(imgs as any);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!albumId || !userId) return;
    
    const token = await (window as any).__getIdToken?.();
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
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'DELETE_FAILED');
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

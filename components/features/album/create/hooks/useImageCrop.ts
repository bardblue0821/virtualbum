import { useState } from 'react';
import { getCroppedBlobSized } from '@/lib/services/image/compression';

export function useImageCrop() {
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [cropping, setCropping] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);

  async function applyCrop(
    idx: number,
    area: { x: number; y: number; width: number; height: number },
    aspect: 'square' | 'rect',
    previews: { file: File; url: string }[],
    setCroppedPreviews: React.Dispatch<React.SetStateAction<({ file: File; url: string } | null)[]>>
  ) {
    const p = previews[idx];
    if (!p) return;

    setCropping(true);
    setCropError(null);
    
    try {
      const output = aspect === 'square' ? { width: 1024, height: 1024 } : { width: 1280, height: 960 };
      const blob = await getCroppedBlobSized(cropSrc ?? p.url, area, output, 'image/jpeg', 0.9);
      const nextFile = new File([blob], p.file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      const nextUrl = URL.createObjectURL(nextFile);

      setCroppedPreviews((prev) => {
        const copy = [...prev];
        if (copy[idx]) URL.revokeObjectURL(copy[idx]!.url);
        copy[idx] = { file: nextFile, url: nextUrl };
        return copy;
      });
    } catch (e: any) {
      setCropError(e?.message || '切り抜きに失敗しました');
    } finally {
      setCropping(false);
      setCropIndex(null);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  }

  function openCrop(idx: number, files: File[], loading: boolean) {
    if (loading) return;
    const f = files[idx];
    if (!f) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(f));
    setCropIndex(idx);
  }

  function closeCrop() {
    if (cropping) return;
    setCropIndex(null);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  return {
    cropIndex,
    cropping,
    cropSrc,
    cropError,
    applyCrop,
    openCrop,
    closeCrop,
  };
}

"use client";
import { useState, useCallback } from "react";
import { translateError } from "@/lib/errors";
import { listImages } from "@/lib/repos/imageRepo";
import { deleteAlbum } from "@/lib/repos/albumRepo";
import type { ImageRecord, AlbumRecord } from "./useAlbumData";

export interface UseImageActionsResult {
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  uploading: boolean;
  showDeleteImageConfirm: boolean;
  deletingImageId: string | null;
  deletingImage: boolean;
  showDeleteLastImageModal: boolean;
  deletingLastImageId: string | null;
  handleAddImage: () => Promise<void>;
  askDeleteImage: (id: string) => void;
  confirmDeleteImage: () => Promise<void>;
  confirmDeleteLastImageWithAlbum: () => Promise<void>;
  cancelDeleteLastImage: () => void;
  setShowDeleteImageConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  setDeletingImageId: React.Dispatch<React.SetStateAction<string | null>>;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FILE_READ_ERROR"));
    reader.readAsDataURL(file);
  });
}

export function useImageActions(
  albumId: string | undefined,
  userId: string | undefined,
  images: ImageRecord[],
  setImages: React.Dispatch<React.SetStateAction<ImageRecord[]>>,
  isOwner: boolean,
  isFriend: boolean,
  setError: (error: string | null) => void,
  router: { replace: (url: string) => void }
): UseImageActionsResult {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDeleteImageConfirm, setShowDeleteImageConfirm] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [showDeleteLastImageModal, setShowDeleteLastImageModal] = useState(false);
  const [deletingLastImageId, setDeletingLastImageId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAddImage = useCallback(async () => {
    if (!userId || !albumId || !file) return;
    
    // 権限チェック
    if (!(isOwner || isFriend)) {
      setError('画像を追加する権限がありません');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const url = await fileToDataUrl(file);
      const token = await (window as any).__getIdToken?.();
      
      console.log('[album:addImage] uploading image');
      const res = await fetch('/api/images/add', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json', 
          'authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify({ albumId, userId, url }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[album:addImage] API error:', data);
        setError(translateError(data?.error || 'UNKNOWN'));
        return;
      }
      
      console.log('[album:addImage] upload successful, refreshing image list');
      
      try {
        const imgs = await listImages(albumId);
        console.log('[album:addImage] image list refreshed', imgs.length);
        imgs.sort(
          (a: any, b: any) =>
            (b.createdAt?.seconds || b.createdAt || 0) -
            (a.createdAt?.seconds || a.createdAt || 0),
        );
        setImages(imgs as ImageRecord[]);
        setFile(null);
        console.log('[album:addImage] complete');
      } catch (listError: any) {
        console.warn('[album:addImage] failed to refresh image list, but upload succeeded:', listError);
        // 楽観的更新
        const newImage = {
          id: Date.now().toString(),
          albumId,
          uploaderId: userId,
          url,
          createdAt: new Date(),
        };
        setImages((prev) => [newImage as ImageRecord, ...prev]);
        setFile(null);
      }
    } catch (e: any) {
      console.error('[album:addImage] error:', e);
      setError(translateError(e));
    } finally {
      setUploading(false);
    }
  }, [albumId, userId, file, isOwner, isFriend, setImages, setError]);

  const askDeleteImage = useCallback((id: string) => {
    if (images.length <= 1) {
      setDeletingLastImageId(id);
      setShowDeleteLastImageModal(true);
      return;
    }
    setDeletingImageId(id);
    setShowDeleteImageConfirm(true);
  }, [images.length]);

  const confirmDeleteImage = useCallback(async () => {
    const id = deletingImageId;
    if (!id || !userId) return;
    
    setDeletingImage(true);
    try {
      const target = images.find((img) => img.id === id);
      if (!target) return;
      
      if (!(isOwner || (isFriend && target.uploaderId === userId))) {
        setError('この画像を削除する権限がありません');
        return;
      }
      
      const token = await (window as any).__getIdToken?.();
      const res = await fetch('/api/images/delete', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json', 
          'authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify({ albumId, userId, imageId: id }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(translateError(data?.error || 'UNKNOWN'));
        return;
      }
      
      const imgs = await listImages(albumId!);
      imgs.sort(
        (a: any, b: any) =>
          (b.createdAt?.seconds || b.createdAt || 0) -
          (a.createdAt?.seconds || a.createdAt || 0),
      );
      setImages(imgs as ImageRecord[]);
      setShowDeleteImageConfirm(false);
      setDeletingImageId(null);
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setDeletingImage(false);
    }
  }, [albumId, userId, deletingImageId, images, isOwner, isFriend, setImages, setError]);

  const confirmDeleteLastImageWithAlbum = useCallback(async () => {
    if (!albumId || !userId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAlbum(albumId);
      try {
        sessionStorage.setItem(
          'app:toast',
          JSON.stringify({ message: 'アルバムを削除しました', variant: 'success', duration: 3000 })
        );
      } catch {}
      router.replace('/timeline');
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setDeleting(false);
      setShowDeleteLastImageModal(false);
      setDeletingLastImageId(null);
    }
  }, [albumId, userId, setError, router]);

  const cancelDeleteLastImage = useCallback(() => {
    setShowDeleteLastImageModal(false);
    setDeletingLastImageId(null);
  }, []);

  return {
    file,
    setFile,
    uploading,
    showDeleteImageConfirm,
    deletingImageId,
    deletingImage,
    showDeleteLastImageModal,
    deletingLastImageId,
    handleAddImage,
    askDeleteImage,
    confirmDeleteImage,
    confirmDeleteLastImageWithAlbum,
    cancelDeleteLastImage,
    setShowDeleteImageConfirm,
    setDeletingImageId,
  };
}

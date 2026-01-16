/*
1. 画像アップロード	handleAddImage() - ファイル選択 → API送信 → リスト更新
2. 画像削除確認	askDeleteImage() - 削除ダイアログ表示
3. 画像削除実行	confirmDeleteImage() - API削除 → リスト更新
4. 最後の画像削除	confirmDeleteLastImageWithAlbum() - 最後の画像の場合はアルバムも削除
5. キャンセル処理	cancelDeleteLastImage() - モーダルクローズ
6. UI ステート管理	ローディング、モーダル表示/非表示の状態
7. 権限チェック	アップロード・削除時に権限検証
*/

"use client"
import { useState, useCallback } from "react";
import { translateError } from "@/lib/errors";
import { listImages } from "@/lib/repos/imageRepo";
import { deleteAlbum } from "@/lib/repos/albumRepo";
import type { ImageRecord } from "../types/album.types";

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

// window.__getIdToken 関数を取得（型安全）
function getIdTokenFn(): (() => Promise<string>) | undefined {
  const win = window as { __getIdToken?: () => Promise<string> };
  return win.__getIdToken;
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
      const idTokenFn = getIdTokenFn();
      const token = idTokenFn ? await idTokenFn() : undefined;
      
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
        const data = await res.json().catch(() => ({})) as { error?: unknown };
        console.error('[album:addImage] API error:', data);
        setError(translateError(data?.error || 'UNKNOWN'));
        return;
      }
      
      console.log('[album:addImage] upload successful, refreshing image list');
      
      try {
        const imgs = await listImages(albumId);
        console.log('[album:addImage] image list refreshed', imgs.length);
        imgs.sort((a: unknown, b: unknown) => {
          const aTime = getTimestampMillis((a as ImageRecord).createdAt);
          const bTime = getTimestampMillis((b as ImageRecord).createdAt);
          return bTime - aTime;
        });
        setImages(imgs as ImageRecord[]);
        setFile(null);
        console.log('[album:addImage] complete');
      } catch (listError: unknown) {
        const error = listError instanceof Error ? listError : new Error(String(listError));
        console.warn('[album:addImage] failed to refresh image list, but upload succeeded:', error);
        // 楽観的更新
        const newImage: ImageRecord = {
          id: Date.now().toString(),
          albumId,
          uploaderId: userId,
          url,
          createdAt: new Date(),
        };
        setImages((prev) => [newImage, ...prev]);
        setFile(null);
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('[album:addImage] error:', error);
      setError(translateError(error));
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
      
      const idTokenFn = getIdTokenFn();
      const token = idTokenFn ? await idTokenFn() : undefined;
      const res = await fetch('/api/images/delete', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json', 
          'authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify({ albumId, userId, imageId: id }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: unknown };
        setError(translateError(data?.error || 'UNKNOWN'));
        return;
      }
      
      const imgs = await listImages(albumId!);
      imgs.sort((a: unknown, b: unknown) => {
        const aTime = getTimestampMillis((a as ImageRecord).createdAt);
        const bTime = getTimestampMillis((b as ImageRecord).createdAt);
        return bTime - aTime;
      });
      setImages(imgs as ImageRecord[]);
      setShowDeleteImageConfirm(false);
      setDeletingImageId(null);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      setError(translateError(error));
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
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      setError(translateError(error));
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

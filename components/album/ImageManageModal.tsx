"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import AlbumImageCropper from "../upload/AlbumImageCropper";
import { getCroppedBlobSized } from "@/src/services/avatar";
import DeleteConfirmModal from "./DeleteConfirmModal";

const MAX_IMAGES_PER_USER = 4;

type ExistingImage = {
  id: string;
  url: string;
  thumbUrl?: string;
  uploaderId: string;
};

type NewImage = {
  file: File;
  previewUrl: string;
  croppedFile?: File;
  croppedPreviewUrl?: string;
};

export interface ImageManageModalProps {
  open: boolean;
  onClose: () => void;
  albumId: string;
  userId: string;
  existingImages: ExistingImage[]; // 自分が投稿した既存画像
  onUploaded: () => void;
  onDeleteImage: (imageId: string) => Promise<void>;
}

export default function ImageManageModal({
  open,
  onClose,
  albumId,
  userId,
  existingImages,
  onUploaded,
  onDeleteImage,
}: ImageManageModalProps) {
  const { user } = useAuthUser();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [cropping, setCropping] = useState(false);
  
  // 削除確認
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // ドラッグ&ドロップ
  const [isDragging, setIsDragging] = useState(false);

  // 計算
  const myExistingCount = existingImages.length;
  const newCount = newImages.length;
  const totalCount = myExistingCount + newCount;
  const remaining = MAX_IMAGES_PER_USER - totalCount;

  // モーダルが閉じたら新規画像をクリア
  useEffect(() => {
    if (!open) {
      newImages.forEach((img) => {
        URL.revokeObjectURL(img.previewUrl);
        if (img.croppedPreviewUrl) URL.revokeObjectURL(img.croppedPreviewUrl);
      });
      setNewImages([]);
      setCropIndex(null);
    }
  }, [open]);

  // ファイル追加処理（共通）
  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const allowCount = Math.min(remaining, fileArray.length);
    if (allowCount === 0) {
      toast.error("これ以上追加できません（上限4枚）");
      return;
    }

    const accepted: NewImage[] = [];
    for (let i = 0; i < allowCount; i++) {
      const file = fileArray[i];
      // 画像ファイルのみ許可
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: 画像ファイルのみ対応しています`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: サイズ上限 5MB を超えています`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      accepted.push({ file, previewUrl });
    }

    if (fileArray.length > allowCount) {
      toast.warning(`${fileArray.length - allowCount} 件は上限のためスキップされました`);
    }

    setNewImages((prev) => [...prev, ...accepted]);
  };

  // ファイル選択処理（input経由）
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFiles(files);
    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && remaining > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading || remaining <= 0) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  };

  // 新規画像を削除
  const removeNewImage = (idx: number) => {
    setNewImages((prev) => {
      const target = prev[idx];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.croppedPreviewUrl) URL.revokeObjectURL(target.croppedPreviewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  // 既存画像の削除確認
  const askDeleteExisting = (imageId: string) => {
    setDeletingImageId(imageId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteExisting = async () => {
    if (!deletingImageId) return;
    setDeleting(true);
    try {
      await onDeleteImage(deletingImageId);
      toast.success("画像を削除しました");
    } catch (e: any) {
      toast.error(e?.message || "削除に失敗しました");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeletingImageId(null);
    }
  };

  // クロップ関連
  const openCrop = (idx: number) => {
    if (uploading) return;
    setCropIndex(idx);
  };

  const closeCrop = () => {
    if (cropping) return;
    setCropIndex(null);
  };

  const applyCrop = async (
    idx: number,
    area: { x: number; y: number; width: number; height: number },
    aspect: "square" | "rect"
  ) => {
    const img = newImages[idx];
    if (!img) return;

    setCropping(true);
    try {
      const output = aspect === "square" ? { width: 1024, height: 1024 } : { width: 1280, height: 960 };
      const blob = await getCroppedBlobSized(img.croppedPreviewUrl ?? img.previewUrl, area, output, "image/jpeg", 0.9);
      const nextFile = new File([blob], img.file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
      const nextUrl = URL.createObjectURL(nextFile);

      setNewImages((prev) =>
        prev.map((x, i) => {
          if (i !== idx) return x;
          if (x.croppedPreviewUrl) URL.revokeObjectURL(x.croppedPreviewUrl);
          return { ...x, croppedFile: nextFile, croppedPreviewUrl: nextUrl };
        })
      );
    } catch (e: any) {
      toast.error(e?.message || "切り抜きに失敗しました");
    } finally {
      setCropping(false);
      setCropIndex(null);
    }
  };

  // 画像リサイズ
  async function fileToCanvasBlob(file: File, maxEdge: number, quality = 0.8): Promise<Blob> {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("IMAGE_LOAD_ERROR"));
        image.src = imgUrl;
      });
      const { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      const dstW = Math.max(1, Math.round(width * scale));
      const dstH = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = dstW;
      canvas.height = dstH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("CANVAS_CONTEXT_ERROR");
      ctx.drawImage(img, 0, 0, dstW, dstH);
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("CANVAS_TO_BLOB_ERROR"))), "image/jpeg", quality);
      });
      return blob;
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  }

  // アップロード処理
  const handleUpload = async () => {
    if (newImages.length === 0) {
      onClose();
      return;
    }

    if (!user) {
      toast.error("ログインが必要です");
      return;
    }

    setUploading(true);
    try {
      for (const img of newImages) {
        const srcFile = img.croppedFile ?? img.file;
        const mainBlob = await fileToCanvasBlob(srcFile, 1600, 0.8);
        const thumbBlob = await fileToCanvasBlob(srcFile, 512, 0.7);

        const ts = Date.now();
        const base = img.file.name.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.[^.]+$/, "");
        const mainRef = ref(storage, `albums/${albumId}/${userId}/${ts}_${base}.jpg`);
        const thumbRef = ref(storage, `albums/${albumId}/${userId}/${ts}_${base}_thumb.jpg`);

        await Promise.all([
          uploadBytesResumable(mainRef, mainBlob, { cacheControl: "public, max-age=31536000, immutable", contentType: "image/jpeg" }),
          uploadBytesResumable(thumbRef, thumbBlob, { cacheControl: "public, max-age=31536000, immutable", contentType: "image/jpeg" }),
        ]);

        const [mainUrl, thumbUrl] = await Promise.all([
          getDownloadURL(mainRef),
          getDownloadURL(thumbRef),
        ]);

        // API 経由で Firestore に登録
        const token = await user.getIdToken();
        const res = await fetch('/api/images/register', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ albumId, userId, url: mainUrl, thumbUrl }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'UPLOAD_FAILED');
        }
      }

      toast.success(`${newImages.length} 件の画像を追加しました`);
      onUploaded();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  // 空き枠クリック
  const handleEmptySlotClick = () => {
    if (remaining <= 0 || uploading) return;
    fileInputRef.current?.click();
  };

  if (!open) return null;

  // 2×2 グリッドのセルを生成
  const cells: React.ReactNode[] = [];
  
  // 1. 既存画像
  for (let i = 0; i < myExistingCount; i++) {
    const img = existingImages[i];
    cells.push(
      <div key={`existing-${img.id}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.thumbUrl || img.url}
          alt="既存画像"
          className="w-full h-full object-cover"
        />
        {/* 削除ボタン */}
        <button
          type="button"
          onClick={() => askDeleteExisting(img.id)}
          disabled={uploading}
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 cursor-pointer disabled:opacity-50"
        >
          ×
        </button>
        <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 rounded">
          投稿済み
        </span>
      </div>
    );
  }

  // 2. 新規画像
  for (let i = 0; i < newCount; i++) {
    const img = newImages[i];
    cells.push(
      <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-line surface-alt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.croppedPreviewUrl ?? img.previewUrl}
          alt="新規画像"
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => openCrop(i)}
        />
        {/* 削除ボタン */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); removeNewImage(i); }}
          disabled={uploading}
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 cursor-pointer disabled:opacity-50"
        >
          ×
        </button>
        <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
          クリックで切抜
        </span>
      </div>
    );
  }

  // 3. 空き枠
  const emptyCount = MAX_IMAGES_PER_USER - totalCount;
  for (let i = 0; i < emptyCount; i++) {
    cells.push(
      <button
        key={`empty-${i}`}
        type="button"
        onClick={handleEmptySlotClick}
        disabled={uploading}
        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {/*<span className="text-xs text-gray-500 text-center">クリック/<br/>ドロップ</span>*/}
      </button>
    );
  }

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* モーダル本体 */}
        <div
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-[min(92vw,640px)] p-5 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 閉じるボタン */}
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer disabled:cursor-not-allowed"
          >
            ✕
          </button>

          {/* タイトル */}
          <h2 className="text-lg font-semibold mb-4">画像を管理</h2>

          {/* 2×2 グリッド - ドラッグ&ドロップ対応 */}
          <div
            className={`relative grid grid-cols-2 gap-2 mb-4 p-2 rounded-lg transition-colors ${
              isDragging
                ? 'border-2 border-dashed border-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-2 border-transparent'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* ドラッグ中のオーバーレイ */}
            {isDragging && remaining > 0 && (
              <div className="col-span-2 absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-lg bg-[var(--accent)]/20">
                <div className="bg-[var(--accent)] text-white px-4 py-2 rounded-lg font-medium shadow-lg">
                  ここにドロップ
                </div>
              </div>
            )}
            {cells}
          </div>

          {/* 残り枠の表示 */}
          <p className="text-sm text-gray-500 mb-4">
            {remaining > 0 ? `あと ${remaining} 枚追加できます` : "上限に達しています（4枚まで）"}
          </p>

          {/* ボタン */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={uploading}>
              キャンセル
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={handleUpload}
              isLoading={uploading}
              disabled={newImages.length === 0}
            >
              投稿
            </Button>
          </div>
        </div>
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* クロップモーダル */}
      {cropIndex !== null && newImages[cropIndex] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeCrop}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg w-[min(96vw,720px)] p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-2 right-2 fg-muted hover-surface-alt rounded px-2 py-1 cursor-pointer disabled:cursor-not-allowed"
              onClick={closeCrop}
              aria-label="閉じる"
              disabled={cropping}
            >
              ✕
            </button>
            <h2 className="text-sm font-semibold mb-3">画像を切り抜く</h2>
            <AlbumImageCropper
              src={newImages[cropIndex].croppedPreviewUrl ?? newImages[cropIndex].previewUrl}
              onCancel={closeCrop}
              onConfirm={(area, _zoom, aspect) => applyCrop(cropIndex, area, aspect)}
            />
            {cropping && <p className="text-xs fg-muted mt-2">切り抜き中...</p>}
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      <DeleteConfirmModal
        open={deleteConfirmOpen}
        busy={deleting}
        onCancel={() => { setDeleteConfirmOpen(false); setDeletingImageId(null); }}
        onConfirm={confirmDeleteExisting}
        message="この画像を削除しますか？"
        description="この操作は取り消せません。"
      />
    </>
  );
}

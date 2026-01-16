"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { createAlbumWithImages, AlbumCreateProgress } from '@/lib/services/album/create-album-with-images.service';
import { useRouter } from 'next/navigation';
import { translateError } from '@/lib/errors';
import { isRateLimitError } from '@/lib/rateLimit';
import { Stack, Group, Text, Progress } from '@mantine/core';
import { useToast } from '@/components/ui/Toast';
import AlbumImageCropper from '@/components/features/upload/AlbumImageCropper';
import { getCroppedBlobSized } from '@/lib/services/image/compression';
import { Button as AppButton } from '@/components/ui/Button';
import TagInput from '@/components/form/TagInput';
import { updateAlbumTags, getAllAlbumTags } from '@/lib/db/repositories/tag.repository';

const MAX_IMAGES = 4;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

interface Props { onCreated?: (albumId: string) => void }

export default function AlbumCreateModal({ onCreated }: Props) {
  const { user } = useAuthUser();
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [placeUrl, setPlaceUrl] = useState('');
  const [comment, setComment] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [albumTags, setAlbumTags] = useState<string[]>([]);
  const [tagCandidates, setTagCandidates] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [croppedPreviews, setCroppedPreviews] = useState<({ file: File; url: string } | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [fileProgress, setFileProgress] = useState<AlbumCreateProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [cropping, setCropping] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const previewsRef = useRef(previews);
  const croppedPreviewsRef = useRef(croppedPreviews);
  useEffect(() => { previewsRef.current = previews; }, [previews]);
  useEffect(() => { croppedPreviewsRef.current = croppedPreviews; }, [croppedPreviews]);

  // 選択クリア時に Object URL を開放
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
      croppedPreviewsRef.current.forEach((p) => p && URL.revokeObjectURL(p.url));
    };
  }, []);

  const [isDragging, setIsDragging] = useState(false);

  // タグ候補を読み込む
  useEffect(() => {
    getAllAlbumTags(100).then(setTagCandidates).catch(() => {});
  }, []);

  // ファイル追加処理（共通）
  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setError(null);

    const remaining = MAX_IMAGES - previews.length;
    if (remaining <= 0) {
      toast.error('これ以上追加できません（上限4枚）');
      return;
    }

    const accepted: { file: File; url: string }[] = [];
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: 画像ファイルのみ対応しています`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: サイズ上限 5MB を超えています`);
        continue;
      }
      accepted.push({ file, url: URL.createObjectURL(file) });
    }

    if (accepted.length > 0) {
      setPreviews((prev) => [...prev, ...accepted]);
      setCroppedPreviews((prev) => [...prev, ...new Array(accepted.length).fill(null)]);
      setFiles((prev) => [...prev, ...accepted.map((a) => a.file)]);
    }
  }

  // ファイル選択処理（input経由）
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList) return;
    addFiles(fileList);
    e.target.value = '';
  }

  // ドラッグ&ドロップ処理
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loading && user) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (loading || !user) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  }

  // 空きマスクリックでファイル選択を開く
  function handleEmptySlotClick() {
    if (loading || !user || previews.length >= MAX_IMAGES) return;
    fileInputRef.current?.click();
  }

  function removeOne(target: File) {
    const idx = previews.findIndex((p) => p.file === target);
    const next = previews.filter((p) => p.file !== target);
    const removed = idx >= 0 ? previews[idx] : undefined;
    if (removed) URL.revokeObjectURL(removed.url);
    if (idx >= 0 && croppedPreviews[idx]) URL.revokeObjectURL(croppedPreviews[idx]!.url);
    setPreviews(next);
    setCroppedPreviews((prev) => prev.filter((_, i) => i !== idx));
    setFiles(next.map((p) => p.file));
  }

  function clearAll() {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    croppedPreviews.forEach((p) => p && URL.revokeObjectURL(p.url));
    setPreviews([]);
    setCroppedPreviews([]);
    setFiles([]);
  }

  async function applyCrop(
    idx: number,
    area: { x: number; y: number; width: number; height: number },
    aspect: 'square' | 'rect'
  ) {
    const p = previews[idx];
    if (!p) return;

    setCropping(true);
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
      setError(e?.message || '切り抜きに失敗しました');
    } finally {
      setCropping(false);
      setCropIndex(null);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  }

  function openCrop(idx: number) {
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

  function fmtBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError('ログインが必要です');
      return;
    }
    if (previews.length === 0) {
      setError('画像を少なくとも1枚選択してください');
      return;
    }
    if (previews.length > 4) {
      setError('画像は最大4枚までです');
      return;
    }
    const uploadFiles = previews.map((p, idx) => croppedPreviews[idx]?.file ?? p.file);
    setError(null);
    setLoading(true);
    setProgress(0);
    try {
      // 逐次進捗: files.length が0ならそのまま
      console.log('[AlbumCreateModal] submit start', { uid: user.uid, files: uploadFiles.map(f=>({name:f.name,size:f.size})) });
      const albumId = await createAlbumWithImages(
        user.uid,
        { title: title || undefined, placeUrl: placeUrl || undefined, firstComment: comment || undefined, visibility },
        uploadFiles,
        (p) => {
          setProgress(p.overallPercent);
          setFileProgress(prev => {
            const copy = [...prev];
            copy[p.fileIndex] = p;
            return copy;
          });
          if (p.state === 'error') {
            console.error('[AlbumCreateModal] file progress error', p);
          }
        }
      );
      setProgress(100);

      // タグを保存（アルバム作成後）
      if (albumTags.length > 0) {
        try {
          await updateAlbumTags(albumId, albumTags, user.uid);
        } catch (e) {
          console.warn('[AlbumCreateModal] Failed to save tags', e);
        }
      }

      if (onCreated) onCreated(albumId);
      console.log('[AlbumCreateModal] success', { albumId });
      // 画面遷移時にトーストを表示
      try {
        sessionStorage.setItem('app:toast', JSON.stringify({ message: 'アルバムを作成しました', variant: 'success' }));
      } catch {}
      router.push(`/album/${albumId}`);
    } catch (err: any) {
      console.error('[AlbumCreateModal] submit error', err);
      if (isRateLimitError(err)) {
        toast.error(err.message);
        setError(null);
      } else {
        setError(translateError(err));
      }
    } finally {
      setLoading(false);
      console.log('[AlbumCreateModal] submit end');
    }
  }

  return (
    <div className="w-full">
      <h1 className="text-xl font-semibold mb-4 sticky top-0 z-10 bg-background py-2 border-b border-line">アルバム作成</h1>
      {!user && <p className="text-sm text-gray-600 mb-4">ログインすると作成できます。</p>}
      <form onSubmit={handleSubmit} className="space-y-4" aria-live="polite">
        <div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-underline"
            disabled={loading || !user}
            placeholder="なんのアルバム？"
          />
        </div>
        <div>
          <input
            value={placeUrl}
            onChange={e => setPlaceUrl(e.target.value)}
            className="input-underline"
            disabled={loading || !user}

            placeholder="https://vrchat.com/..."
          />
        </div>
        <div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="input-underline text-sm"
            disabled={loading || !user}
            maxLength={200}
            rows={3}
            placeholder="どうだった？(200文字まで)"
          />
          <p className="text-xs text-gray-500 text-right">{comment.length}/200</p>
        </div>
        <div>
          <div className="flex items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                disabled={loading || !user}
              />
              <span>公開</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="visibility"
                value="friends"
                checked={visibility === 'friends'}
                onChange={() => setVisibility('friends')}
                disabled={loading || !user}
              />
              <span>フレンド限定</span>
            </label>
          </div>
          <p className="text-xs text-muted mt-1">
            フレンド限定にすると、ウォッチャーや非フレンドには完全に表示されません。共有・リポストも無効になります。
          </p>
        </div>

        {/* タグ入力 */}
        <div>
          <label className="block text-sm text-muted mb-1">タグ（最大5つ）</label>
          <TagInput
            tags={albumTags}
            onChange={setAlbumTags}
            candidates={tagCandidates}
            placeholder="タグを入力（Enterで追加）"
            maxTags={5}
            disabled={loading || !user}
          />
          <p className="text-xs text-muted mt-1">
            タグは検索で使用されます。日本語・英数字・アンダースコアが使えます。
          </p>
        </div>

        <div>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={loading || !user}
          />
          
          {/* 田の字グリッド（2x2）- ドラッグ&ドロップ対応 */}
          <div
            className={`relative grid grid-cols-2 gap-3 p-2 rounded-lg transition-colors ${
              isDragging 
                ? 'border-2 border-dashed border-[var(--accent)] bg-[var(--accent)]/10' 
                : 'border-2 border-transparent'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* ドラッグ中のオーバーレイ */}
            {isDragging && previews.length < MAX_IMAGES && (
              <div className="col-span-2 absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-lg bg-[var(--accent)]/20">
                <div className="bg-[var(--accent)] text-white px-4 py-2 rounded-lg font-medium shadow-lg">
                  ここにドロップ
                </div>
              </div>
            )}
            {/* 選択済み画像 */}
            {previews.map((p, idx) => (
              <div
                key={p.url}
                className="relative aspect-square rounded-lg overflow-hidden border-2 border-line surface-alt"
              >
                {/* 削除ボタン */}
                <button
                  type="button"
                  aria-label={`${p.file.name} を削除`}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-red-600 text-white text-lg leading-none flex items-center justify-center hover:bg-red-700 cursor-pointer disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); removeOne(p.file); }}
                  disabled={loading}
                >
                  ×
                </button>
                
                {/* 画像（クリックでクロップ） */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={croppedPreviews[idx]?.url ?? p.url}
                  alt={p.file.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => openCrop(idx)}
                />
                
                {/* クリックで切抜ラベル */}
                <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                  クリックで切抜
                </span>
              </div>
            ))}
            
            {/* 空きマス */}
            {Array.from({ length: MAX_IMAGES - previews.length }).map((_, i) => (
              <button
                key={`empty-${i}`}
                type="button"
                onClick={handleEmptySlotClick}
                disabled={loading || !user}
                className="aspect-square rounded-lg border-2 border-dashed border-line flex flex-col items-center justify-center gap-2 hover:border-[var(--accent)] hover:bg-surface-weak transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="text-sm text-muted text-center">クリックまたは<br/>ドラッグ&ドロップ</span>
              </button>
            ))}
          </div>
          
          {previews.length > 0 && (
            <div className="mt-3 flex justify-between items-center">
              <p className="text-xs text-muted">選択中: {previews.length} / {MAX_IMAGES}</p>
              <button
                type="button"
                onClick={clearAll}
                disabled={loading}
                className="text-xs text-red-500 hover:text-red-600 cursor-pointer disabled:opacity-50"
              >
                すべて外す
              </button>
            </div>
          )}
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {loading && (
          <div role="status" className="space-y-2">
            <Group justify="space-between" align="center">
              <Text size="sm">アップロード中...</Text>
              <div style={{ minWidth: 220 }}><Progress value={progress} color="teal" animated /></div>
            </Group>
            <ul className="text-xs text-gray-600 space-y-1">
              {fileProgress.map((fp,i)=>(
                <li key={i}>
                  画像{i+1}: {fp.percent}% {fp.state==='error' && <span className="text-red-600">(失敗 {fp.error})</span>} {fp.state==='success' && <span className="text-green-600">OK</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <AppButton
          type="submit"
          variant="accent"
          isLoading={loading}
          disabled={loading || !user}
        >
          {loading ? '処理中...' : '作成'}
        </AppButton>
      </form>

      {cropIndex !== null && previews[cropIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeCrop}
        >
          <div
            className="surface-alt border border-line rounded shadow-lg w-[min(96vw,720px)] p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-muted hover:bg-surface-weak rounded cursor-pointer disabled:cursor-not-allowed"
              onClick={closeCrop}
              aria-label="閉じる"
              disabled={cropping}
            >
              ✕
            </button>
            <h2 className="text-sm font-semibold mb-3">画像を切り抜く</h2>
            <AlbumImageCropper
              src={cropSrc ?? previews[cropIndex].url}
              onCancel={closeCrop}
              onConfirm={(area, _zoom, aspect) => applyCrop(cropIndex, area, aspect)}
            />
            {cropping && <p className="text-xs text-muted mt-2">切り抜き中...</p>}
          </div>
        </div>
      )}
    </div>
  );
}

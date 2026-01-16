"use client";
import React, { useEffect, useState } from 'react';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { createAlbumWithImages, AlbumCreateProgress } from '@/lib/services/album/create-album-with-images.service';
import { useRouter } from 'next/navigation';
import { translateError } from '@/lib/errors';
import { isRateLimitError } from '@/lib/rateLimit';
import { useToast } from '@/components/ui/Toast';
import { Button as AppButton } from '@/components/ui/Button';
import { updateAlbumTags, getAllAlbumTags } from '@/lib/db/repositories/tag.repository';
import { useAlbumImageUpload } from './hooks/useAlbumImageUpload';
import { useImageCrop } from './hooks/useImageCrop';
import AlbumFormFields from './components/AlbumFormFields';
import AlbumImageGrid from './components/AlbumImageGrid';
import AlbumUploadProgress from './components/AlbumUploadProgress';
import ImageCropModal from './components/ImageCropModal';

interface Props { onCreated?: (albumId: string) => void }


export default function AlbumCreateModal({ onCreated }: Props) {
  const { user } = useAuthUser();
  const router = useRouter();
  const toast = useToast();
  
  // フォーム状態
  const [title, setTitle] = useState('');
  const [placeUrl, setPlaceUrl] = useState('');
  const [comment, setComment] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [albumTags, setAlbumTags] = useState<string[]>([]);
  const [tagCandidates, setTagCandidates] = useState<string[]>([]);
  
  // アップロード状態
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [fileProgress, setFileProgress] = useState<AlbumCreateProgress[]>([]);
  const [loading, setLoading] = useState(false);

  // カスタムフック
  const imageUpload = useAlbumImageUpload();
  const imageCrop = useImageCrop();

  // タグ候補を読み込む
  useEffect(() => {
    getAllAlbumTags(100).then(setTagCandidates).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError('ログインが必要です');
      return;
    }
    if (imageUpload.previews.length === 0) {
      setError('画像を少なくとも1枚選択してください');
      return;
    }
    if (imageUpload.previews.length > 4) {
      setError('画像は最大4枚までです');
      return;
    }
    
    const uploadFiles = imageUpload.getUploadFiles();
    setError(null);
    setLoading(true);
    setProgress(0);
    
    try {
      console.log('[AlbumCreateModal] submit start', { 
        uid: user.uid, 
        files: uploadFiles.map(f => ({ name: f.name, size: f.size })) 
      });
      
      const albumId = await createAlbumWithImages(
        user.uid,
        { 
          title: title || undefined, 
          placeUrl: placeUrl || undefined, 
          firstComment: comment || undefined, 
          visibility 
        },
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
        sessionStorage.setItem('app:toast', JSON.stringify({ 
          message: 'アルバムを作成しました', 
          variant: 'success' 
        }));
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
      <h1 className="text-xl font-semibold mb-4 sticky top-0 z-10 bg-background py-2 border-b border-line">
        アルバム作成
      </h1>
      {!user && <p className="text-sm text-gray-600 mb-4">ログインすると作成できます。</p>}
      
      <form onSubmit={handleSubmit} className="space-y-4" aria-live="polite">
        <AlbumFormFields
          title={title}
          setTitle={setTitle}
          placeUrl={placeUrl}
          setPlaceUrl={setPlaceUrl}
          comment={comment}
          setComment={setComment}
          visibility={visibility}
          setVisibility={setVisibility}
          albumTags={albumTags}
          setAlbumTags={setAlbumTags}
          tagCandidates={tagCandidates}
          loading={loading}
          disabled={!user}
        />

        <AlbumImageGrid
          previews={imageUpload.previews}
          croppedPreviews={imageUpload.croppedPreviews}
          isDragging={imageUpload.isDragging}
          loading={loading}
          disabled={!user}
          maxImages={imageUpload.MAX_IMAGES}
          fileInputRef={imageUpload.fileInputRef}
          onFileSelect={imageUpload.handleFileSelect}
          onDragOver={(e) => imageUpload.handleDragOver(e, loading, user)}
          onDragLeave={imageUpload.handleDragLeave}
          onDrop={(e) => imageUpload.handleDrop(e, loading, user)}
          onEmptySlotClick={() => imageUpload.handleEmptySlotClick(loading, user)}
          onRemove={imageUpload.removeOne}
          onClearAll={imageUpload.clearAll}
          onOpenCrop={(idx) => imageCrop.openCrop(idx, imageUpload.files, loading)}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}
        
        {loading && (
          <AlbumUploadProgress progress={progress} fileProgress={fileProgress} />
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

      <ImageCropModal
        isOpen={imageCrop.cropIndex !== null && imageUpload.previews[imageCrop.cropIndex ?? -1] !== undefined}
        cropSrc={imageCrop.cropSrc}
        cropping={imageCrop.cropping}
        onClose={imageCrop.closeCrop}
        onConfirm={(area, _zoom, aspect) => {
          if (imageCrop.cropIndex !== null) {
            imageCrop.applyCrop(
              imageCrop.cropIndex,
              area,
              aspect,
              imageUpload.previews,
              imageUpload.setCroppedPreviews
            );
          }
        }}
      />
    </div>
  );
}

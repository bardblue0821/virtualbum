import React from "react";
import { type PhotoItem } from "../gallery/GalleryGrid";

export interface GallerySectionProps {
  photos: PhotoItem[];
  imagesLength: number;
  visibleCount: number;
  onSeeMore: () => void;
  canDelete: (p: PhotoItem) => boolean;
  onDelete: (p: PhotoItem) => void;
  showUploader: boolean;
  remaining: number;
  onOpenManageModal: () => void;
  rowHeight?: number;
  margin?: number;
  columns?: number;
}

export default function GallerySection(props: GallerySectionProps) {
  const { photos, imagesLength, visibleCount, onSeeMore, canDelete, onDelete, showUploader, remaining, onOpenManageModal, rowHeight = 240, margin = 6 } = props;

  return (
    <section>
      {imagesLength === 0 && !showUploader && <p className="text-sm fg-subtle">まだ画像がありません</p>}
      
      {/* グリッド表示（画像 + 追加枠） */}
      <div className="grid grid-cols-3 gap-2">
        {/* 既存の画像 */}
        {photos.slice(0, visibleCount).map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbSrc || photo.src}
              alt={photo.alt || "image"}
              className="w-full h-full object-cover cursor-pointer"
              loading="lazy"
            />
            {canDelete(photo) && (
              <button
                type="button"
                aria-label="画像を削除"
                onClick={() => onDelete(photo)}
                className="absolute right-1 top-1 w-7 h-7 rounded-full bg-red-600 text-white opacity-80 hover:opacity-100 flex items-center justify-center cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            )}
            {/* 投稿者アイコン */}
            {photo.uploaderIconURL && (
              <a
                href={`/user/${photo.uploaderHandle || photo.uploaderId}`}
                className="absolute left-1 bottom-1"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.uploaderIconURL}
                  alt="uploader"
                  className="h-8 w-8 rounded-full border-2 border-white"
                  loading="lazy"
                />
              </a>
            )}
          </div>
        ))}
        
        {/* 画像追加枠（常に表示） */}
        {showUploader && (
          <button
            type="button"
            onClick={onOpenManageModal}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="text-xs text-gray-500">{remaining > 0 ? "追加" : "管理"}</span>
          </button>
        )}
      </div>

      {imagesLength > visibleCount && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            className="rounded border border-base px-3 py-1.5 text-sm hover-surface-alt"
            onClick={onSeeMore}
          >もっと見る</button>
        </div>
      )}
    </section>
  );
}

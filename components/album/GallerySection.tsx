"use client";

import React, { useRef, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { type PhotoItem } from "../gallery/GalleryGrid";

// lightGallery はクライアント側のみで読み込む
const LightGallery = dynamic(() => import("lightgallery/react"), { ssr: false });
import lgZoom from "lightgallery/plugins/zoom";
import lgThumbnail from "lightgallery/plugins/thumbnail";

// 日時フォーマット: yyyy.mm.dd.
function formatCreatedAt(createdAt: any): string {
  let date: Date;
  if (createdAt?.toDate) {
    // Firestore Timestamp
    date = createdAt.toDate();
  } else if (createdAt?.seconds) {
    // Firestore Timestamp (plain object)
    date = new Date(createdAt.seconds * 1000);
  } else if (typeof createdAt === 'number') {
    date = new Date(createdAt);
  } else if (createdAt instanceof Date) {
    date = createdAt;
  } else {
    return '';
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}.`;
}

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
  const { photos, imagesLength, visibleCount, onSeeMore, canDelete, onDelete, showUploader, remaining, onOpenManageModal } = props;
  const lgRef = useRef<any>(null);
  
  const visiblePhotos = useMemo(() => photos.slice(0, visibleCount), [photos, visibleCount]);

  // LightGalleryのsubHtml用にHTMLを生成
  const buildSubHtml = (p: PhotoItem): string | undefined => {
    const iconUrl = p.uploaderIconURL || '/default-avatar.png';
    const name = p.uploaderHandle || '投稿者';
    const dateStr = formatCreatedAt(p.createdAt);
    
    // アイコン + 名前 + 日時を横並びで表示
    return `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 0;">
        <img src="${iconUrl}" alt="" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
        <span style="font-size: 14px; color: #fff;">${name}</span>
        <span style="font-size: 12px; color: #fff;">${dateStr}</span>
      </div>
    `;
  };
  
  const dynamicEl = useMemo(
    () =>
      visiblePhotos.map((p) => ({
        src: p.src,
        thumb: p.thumbSrc || p.src,
        subHtml: buildSubHtml(p),
      })),
    [visiblePhotos]
  );

  const openLightbox = (index: number) => {
    lgRef.current?.openGallery(index);
  };

  return (
    <section>
      {imagesLength === 0 && !showUploader && <p className="text-sm fg-subtle">まだ画像がありません</p>}
      
      {/* グリッド表示（追加枠 + 画像） */}
      <div className="grid grid-cols-3 gap-2">
        {/* 画像追加枠（先頭に表示） */}
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
        
        {/* 画像 */}
        {visiblePhotos.map((photo, idx) => (
          <div 
            key={photo.id || idx} 
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => openLightbox(idx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(idx);
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbSrc || photo.src}
              alt={photo.alt || "image"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {canDelete(photo) && (
              <button
                type="button"
                aria-label="画像を削除"
                onClick={(e) => { e.stopPropagation(); onDelete(photo); }}
                className="absolute right-1 top-1 w-7 h-7 rounded-full bg-red-600 text-white opacity-80 hover:opacity-100 flex items-center justify-center cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            )}
            {/* 投稿者アイコンと日時 */}
            <div className="absolute left-1 bottom-1 flex items-center gap-1">
              {photo.uploaderIconURL && (
                <a
                  href={`/user/${photo.uploaderHandle || photo.uploaderId}`}
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
              {photo.createdAt && (
                <span className="text-xs text-friend font-medium drop-shadow-sm">
                  {formatCreatedAt(photo.createdAt)}
                </span>
              )}
            </div>
            {/* ALTボタン（右下） */}
            {photo.alt && (
              <div className="absolute right-1 bottom-1 group/alt">
                <span className="inline-block bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-help">
                  ALT
                </span>
                <div className="absolute right-0 bottom-full mb-1 hidden group-hover/alt:block w-max max-w-[200px] bg-black/90 text-white text-xs p-2 rounded shadow-lg z-10">
                  {photo.alt}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 非表示の LightGallery（プログラムで開く） */}
      {visiblePhotos.length > 0 && (
        <LightGallery
          onInit={(ref: any) => { lgRef.current = ref.instance; }}
          dynamic
          dynamicEl={dynamicEl}
          plugins={[lgZoom, lgThumbnail]}
          download={false}
          showThumbByDefault
          speed={300}
        />
      )}

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

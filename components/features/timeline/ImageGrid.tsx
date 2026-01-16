"use client";
import React from "react";
import type { Img } from "./types";

interface ImageGridProps {
  images: Img[];
  albumId: string;
  className?: string;
}

/**
 * タイムライン用の画像グリッド表示
 * 1〜4枚の画像を最適なレイアウトで表示
 */
export function ImageGrid({ images, albumId, className = "" }: ImageGridProps) {
  const n = Math.min(images.length, 4);
  const list = images.slice(0, n);
  
  if (n === 0) return null;

  // 共通: アスペクト比ボックス（cover トリミング）
  const Box = ({ 
    ratioW, 
    ratioH, 
    src, 
    alt, 
    href 
  }: { 
    ratioW: number; 
    ratioH: number; 
    src: string; 
    alt: string; 
    href?: string;
  }) => (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        aspectRatio: `${ratioW} / ${ratioH}`, 
        overflow: 'hidden', 
        borderRadius: 6 
      }}
    >
      {href ? (
        <a href={href} aria-label="アルバム詳細へ" className="absolute inset-0 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={src} 
            alt={alt} 
            loading="lazy" 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        </a>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={src} 
          alt={alt} 
          loading="lazy" 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' 
          }} 
        />
      )}
    </div>
  );

  const albumHref = `/album/${albumId}`;

  // 1枚: 正方形
  if (n === 1) {
    const src = list[0].thumbUrl || list[0].url;
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <Box ratioW={1} ratioH={1} src={src} alt="image" href={albumHref} />
      </div>
    );
  }

  // 2枚: 各タイルを 2:1（横長）にして縦に2枚積む
  if (n === 2) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {list.map((img, i) => (
          <Box 
            key={i} 
            ratioW={2} 
            ratioH={1} 
            src={img.thumbUrl || img.url} 
            alt={`image-${i}`} 
            href={albumHref} 
          />
        ))}
      </div>
    );
  }

  // 3枚: CSS Gridで左を2行スパン、右は1:1を上下2枚
  if (n === 3) {
    const left = list[0];
    const right = list.slice(1);
    return (
      <div className={`grid gap-1 ${className}`} style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* 左（2行分を占有） */}
        <div className="row-span-2 relative overflow-hidden rounded-md">
          <a href={albumHref} aria-label="アルバム詳細へ" className="absolute inset-0 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={left.thumbUrl || left.url}
              alt="image-0"
              loading="lazy"
              style={{ 
                position: 'absolute', 
                inset: 0, 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }}
            />
          </a>
        </div>
        {/* 右上 */}
        <Box ratioW={1} ratioH={1} src={right[0].thumbUrl || right[0].url} alt="image-1" href={albumHref} />
        {/* 右下 */}
        <Box ratioW={1} ratioH={1} src={right[1].thumbUrl || right[1].url} alt="image-2" href={albumHref} />
      </div>
    );
  }

  // 4枚: 2x2 で全て 1:1
  return (
    <div className={`grid grid-cols-2 gap-1 ${className}`}>
      {list.map((img, i) => (
        <Box 
          key={i} 
          ratioW={1} 
          ratioH={1} 
          src={img.thumbUrl || img.url} 
          alt={`image-${i}`} 
          href={albumHref} 
        />
      ))}
    </div>
  );
}

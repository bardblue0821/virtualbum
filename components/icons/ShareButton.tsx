"use client";
import React, { useState, useCallback } from 'react';

export interface ShareButtonProps {
  /** 共有するURL */
  url?: string;
  /** 共有タイトル */
  title?: string;
  /** 共有テキスト */
  text?: string;
  /** ボタンサイズ（px） */
  size?: number;
  /** クラス名 */
  className?: string;
  /** コピー完了時のコールバック */
  onCopied?: () => void;
}

/**
 * プロフィールやアルバムの共有ボタン
 * Web Share APIが使えればネイティブ共有、なければクリップボードにコピー
 */
export default function ShareButton({
  url,
  title = '',
  text = '',
  size = 20,
  className = '',
  onCopied,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    
    // Web Share API が使える場合
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title || document.title,
          text: text,
          url: shareUrl,
        });
        return;
      } catch (e) {
        // ユーザーがキャンセルした場合など
        if ((e as Error).name !== 'AbortError') {
          console.error('Share failed:', e);
        }
      }
    }

    // フォールバック: クリップボードにコピー
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  }, [url, title, text, onCopied]);

  return (
    <button
      type="button"
      onClick={handleShare}
      title={copied ? 'コピーしました！' : 'プロフィールを共有'}
      aria-label={copied ? 'コピーしました！' : 'プロフィールを共有'}
      className={`
        inline-flex items-center justify-center
        rounded-full p-1.5
        text-foreground/60 hover:text-foreground
        hover:bg-surface-weak
        transition-colors duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]/40
        ${copied ? 'text-green-600!' : ''}
        ${className}
      `.trim()}
    >
      {copied ? (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {/* チェックマーク */}
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {/* 共有アイコン */}
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
    </button>
  );
}

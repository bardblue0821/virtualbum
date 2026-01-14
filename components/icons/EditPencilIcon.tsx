"use client";
import React from 'react';

export interface EditPencilIconProps {
  /** ボタンのサイズ（px） */
  size?: number;
  /** クリック時のコールバック */
  onClick?: () => void;
  /** クラス名 */
  className?: string;
  /** ツールチップテキスト */
  title?: string;
  /** 無効化 */
  disabled?: boolean;
}

/**
 * 編集可能であることを示す鉛筆アイコンボタン
 * プロフィールやアルバムなどの編集開始に使用
 */
export default function EditPencilIcon({
  size = 20,
  onClick,
  className = '',
  title = '編集',
  disabled = false,
}: EditPencilIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`
        inline-flex items-center justify-center
        rounded-full p-1.5
        text-foreground/60 hover:text-foreground
        hover:bg-surface-weak
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]/40
        ${className}
      `.trim()}
    >
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
        {/* 鉛筆アイコン */}
        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    </button>
  );
}

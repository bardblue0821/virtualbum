import React from 'react';

interface ErrorMessageProps {
  error: string | null | undefined;
  /** テキストサイズ (default: sm) */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** カスタムクラス名 */
  className?: string;
}

/**
 * エラーメッセージ表示用の共通コンポーネント
 */
export function ErrorMessage({ error, size = 'sm', className = '' }: ErrorMessageProps) {
  if (!error) return null;

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <p className={`text-red-600 ${sizeClasses[size]} ${className}`}>
      {error}
    </p>
  );
}

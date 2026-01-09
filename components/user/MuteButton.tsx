"use client";

import React from 'react';
import { Button } from '../ui/Button';

export interface MuteButtonProps {
  muted: boolean;
  busy: boolean;
  onToggle: () => Promise<void>;
  className?: string;
}

/**
 * ミュート/ミュート解除ボタン
 * ブロックより軽い操作なので確認モーダルなし
 */
export default function MuteButton({ muted, busy, onToggle, className = '' }: MuteButtonProps) {
  const handleClick = async () => {
    await onToggle();
  };

  return (
    <Button
      type="button"
      variant={muted ? 'accentSky' : 'ghost'}
      size="sm"
      onClick={handleClick}
      disabled={busy}
      className={className}
    >
      {busy ? '処理中...' : muted ? 'ミュート中' : 'ミュート'}
    </Button>
  );
}

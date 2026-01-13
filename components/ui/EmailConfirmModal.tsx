"use client";

import React from 'react';
import { Button } from './Button';

export interface EmailConfirmModalProps {
  open: boolean;
  email: string;
  onClose: () => void;
}

/**
 * メール確認モーダル
 * 新規登録後に「メールを確認してください」メッセージを表示
 */
export default function EmailConfirmModal({
  open,
  email,
  onClose,
}: EmailConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      data-testid="email-confirm-modal-overlay"
    >
      <div
        className="surface-alt border border-base rounded-lg shadow-xl w-[min(90vw,400px)] p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-confirm-title"
      >
        <div className="flex justify-between items-center mb-3">
          <h2 id="email-confirm-title" className="text-lg font-semibold">
            メールを確認してください
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        
        <div className="text-sm fg-muted mb-4 space-y-3">
          <p>
            <span className="font-medium text-accent">{email}</span> 宛に確認メールを送信しました。
          </p>
          <p>
            メール内のリンクをクリックして、本登録を完了してください。
          </p>
          <p className="text-xs fg-subtle">
            ※ メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={onClose}
          >
            確認
          </Button>
        </div>
      </div>
    </div>
  );
}

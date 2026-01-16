"use client";

import React from 'react';
import { Button } from '@/components/ui/Button';

export interface BlockConfirmModalProps {
  open: boolean;
  blocked: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ブロック/ブロック解除確認モーダル
 */
export default function BlockConfirmModal({
  open,
  blocked,
  busy,
  onConfirm,
  onCancel,
}: BlockConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-[min(90vw,400px)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-3">
          {blocked ? 'ブロックを解除しますか？' : 'このユーザーをブロックしますか？'}
        </h2>
        
        {!blocked && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <p>ブロックすると以下の効果があります：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>相手のアルバムがタイムラインに表示されなくなります</li>
              <li>相手はあなたのアルバムを閲覧できなくなります</li>
              <li>相手からのフレンド申請を受け付けなくなります</li>
              <li>相手はあなたのアルバムにコメント・リアクションできなくなります</li>
            </ul>
            <p className="text-orange-600 dark:text-orange-400 font-medium">
              ※ フレンド関係・ウォッチは自動的に解除されます
            </p>
          </div>
        )}
        
        {blocked && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            ブロックを解除すると、相手のアルバムが再び表示されるようになります。
            ただし、フレンド関係・ウォッチは自動的に復元されません。
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={busy}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            variant={blocked ? 'accent' : 'danger'}
            size="sm"
            onClick={onConfirm}
            isLoading={busy}
          >
            {blocked ? '解除する' : 'ブロックする'}
          </Button>
        </div>
      </div>
    </div>
  );
}

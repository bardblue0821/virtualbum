"use client";
import React from 'react';
import Avatar from '@/components/features/profile/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export interface UserListItem {
  uid: string;
  handle?: string | null;
  displayName?: string | null;
  iconURL?: string | null;
}

interface UserListModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  count: number;
  users: UserListItem[] | null;
  loading: boolean;
  emptyMessage?: string;
}

/*Watchers/Friends 共通のユーザー一覧モーダル*/
export default function UserListModal({
  open,
  onClose,
  title,
  count,
  users,
  loading,
  emptyMessage = 'ユーザーはいません',
}: UserListModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-surface-weak border border-line rounded shadow-lg max-w-sm w-[90%] p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold">
          {title}（{count}）
        </h3>

        {loading && <LoadingSpinner size="xs" />}

        {!loading && users && users.length > 0 ? (
          <ul className="max-h-80 overflow-auto divide-y divide-line">
            {users.map((u) => (
              <li key={u.uid} className="py-2">
                <a
                  href={`/user/${u.handle || u.uid}`}
                  className="flex items-center gap-2 hover:bg-surface-weak px-1"
                >
                  <Avatar src={u.iconURL || undefined} size={28} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {u.displayName || '名前未設定'}
                    </div>
                    <div className="text-[11px] text-muted/80 truncate">
                      @{u.handle || u.uid.slice(0, 6)}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          !loading && <p className="text-xs text-muted/80">{emptyMessage}</p>
        )}

        <div className="flex justify-end">
          <Button type="button" size="xs" variant="ghost" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}

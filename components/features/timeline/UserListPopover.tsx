"use client";
import React from "react";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/lib/utils/imageUrl";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export interface UserListItem {
  uid: string;
  displayName?: string | null;
  handle?: string | null;
  iconURL?: string | null;
}

interface UserListPopoverProps {
  title: string;
  users: UserListItem[];
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * ユーザー一覧をホバー表示するポップオーバー
 * いいね、リポスト、リアクションで共通使用
 */
export function UserListPopover({ 
  title, 
  users, 
  loading = false,
  emptyMessage = "まだいません"
}: UserListPopoverProps) {
  return (
    <div className="absolute left-0 top-full mt-1 w-64 rounded border border-line bg-background shadow-lg z-40">
      <div className="p-2">
        <p className="text-[11px] text-muted/80 mb-1">{title}</p>
        {loading && <LoadingSpinner size="xs" />}
        {!loading && (
          users.length > 0 ? (
            <ul className="max-h-64 overflow-auto divide-y divide-line">
              {users.map((u) => (
                <UserListItemRow key={u.uid} user={u} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted/80">{emptyMessage}</p>
          )
        )}
      </div>
    </div>
  );
}

function UserListItemRow({ user }: { user: UserListItem }) {
  const name = user.displayName || '名前未設定';
  const iconUrl = user.iconURL;
  
  return (
    <li>
      <a 
        href={`/user/${user.handle || user.uid}`} 
        className="flex items-center gap-2 px-2 py-1 hover:bg-surface-weak"
      >
        {iconUrl ? (
          <div className="relative h-5 w-5 rounded-full overflow-hidden flex-shrink-0">
            <Image 
              src={iconUrl.startsWith('data:') ? iconUrl : getOptimizedImageUrl(iconUrl, 'thumb')} 
              alt="" 
              fill
              sizes="20px"
              className="object-cover"
              unoptimized={iconUrl.startsWith('data:')}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== iconUrl) {
                  target.src = iconUrl || '';
                }
              }}
            />
          </div>
        ) : (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-weak text-[10px] text-muted">
            {name[0] || '?'}
          </span>
        )}
        <span className="text-sm font-medium">{name}</span>
        {user.handle && <span className="text-[11px] text-muted/80">@{user.handle}</span>}
      </a>
    </li>
  );
}

"use client";
import React from "react";
import Link from "next/link";
import Avatar from "@/components/features/profile/Avatar";
import { UserHit } from "@/lib/db/repositories/search.repository";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface UserSearchResultsProps {
  users: UserHit[];
  loading: boolean;
  hasQuery: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function UserSearchResults({
  users,
  loading,
  hasQuery,
  hasMore,
  loadingMore,
  sentinelRef,
}: UserSearchResultsProps) {
  return (
    <section>
      <h2 className="font-medium mb-2">
        ユーザー {users.length ? `(${users.length})` : ""}
      </h2>
      {!hasQuery && <p className="text-sm fg-subtle">キーワードを入力してください</p>}
      {hasQuery && users.length === 0 && !loading && (
        <p className="text-sm fg-subtle">該当なし</p>
      )}
      <ul className="space-y-1">
        {users.map((u) => (
          <li key={u.uid}>
            <Link
              href={`/user/${u.handle || u.uid}`}
              className="flex items-center gap-3 rounded px-2 py-2 hover-surface-alt"
            >
              <Avatar
                size={36}
                src={u.iconURL || undefined}
                alt={u.displayName ? `${u.displayName}のアイコン` : "ユーザーアイコン"}
                interactive={false}
                withBorder={false}
                className="rounded-full shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {u.displayName || "名前未設定"}
                </div>
                <div className="text-xs fg-subtle truncate">
                  @{u.handle || u.uid.slice(0, 6)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && <div ref={sentinelRef} className="h-4" />}
      {loadingMore && <LoadingSpinner size="xs" />}
    </section>
  );
}

"use client";
import React from "react";
import Link from "next/link";
import Avatar from "@/components/features/profile/Avatar";
import { TagList } from "@/components/common/TagList";
import { SearchAlbumCard } from "@/components/features/search/SearchAlbumCard";
import type { UserTagResult, AlbumTagResult } from "../_lib/hooks";

interface TagSearchResultsProps {
  userTagResults: UserTagResult[];
  albumTagResults: AlbumTagResult[];
  loading: boolean;
  hasQuery: boolean;
  showUserTags: boolean;
  showAlbumTags: boolean;
}

export function TagSearchResults({
  userTagResults,
  albumTagResults,
  loading,
  hasQuery,
  showUserTags,
  showAlbumTags,
}: TagSearchResultsProps) {
  return (
    <>
      {/* タグで見つかったユーザー */}
      {showUserTags && (
        <section>
          <h2 className="font-medium mb-2">
            タグ: ユーザー {userTagResults.length ? `(${userTagResults.length})` : ""}
          </h2>
          {!hasQuery && <p className="text-sm fg-subtle">キーワードを入力してください</p>}
          {hasQuery && userTagResults.length === 0 && !loading && (
            <p className="text-sm fg-subtle">該当なし</p>
          )}
          <ul className="space-y-1">
            {userTagResults.map((u) => (
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
                    {u.tags.length > 0 && (
                      <div className="mt-1">
                        <TagList tags={u.tags} />
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* タグで見つかったアルバム */}
      {showAlbumTags && (
        <section>
          <h2 className="font-medium mb-2">
            タグ: アルバム {albumTagResults.length ? `(${albumTagResults.length})` : ""}
          </h2>
          {!hasQuery && <p className="text-sm fg-subtle">キーワードを入力してください</p>}
          {hasQuery && albumTagResults.length === 0 && !loading && (
            <p className="text-sm fg-subtle">該当なし</p>
          )}
          <div className="divide-y divide-line">
            {albumTagResults.map((a) => (
              <SearchAlbumCard
                key={a.id}
                id={a.id}
                title={a.title}
                ownerId={a.ownerId}
                ownerName={a.ownerName}
                ownerHandle={a.ownerHandle || undefined}
                ownerIconURL={a.ownerIconURL || undefined}
                createdAt={a.createdAt}
                firstImageUrl={a.firstImageUrl || undefined}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

"use client";
import React from "react";
import Link from "next/link";
import Avatar from "../profile/Avatar";

interface SearchAlbumCardProps {
  id: string;
  title?: string;
  ownerId?: string;
  ownerName?: string;
  ownerHandle?: string;
  ownerIconURL?: string;
  createdAt?: any;
  firstImageUrl?: string;
}

function formatDate(value?: any): string {
  if (!value) return "";
  try {
    let d: Date;
    if (value instanceof Date) {
      d = value;
    } else if (typeof value === "object" && value?.toDate) {
      d = value.toDate();
    } else if (typeof value === "object" && value?.seconds) {
      d = new Date(value.seconds * 1000);
    } else if (typeof value === "number") {
      d = new Date(value > 1e12 ? value : value * 1000);
    } else {
      return "";
    }
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/**
 * 検索結果用アルバムカード
 * タイムラインと同じ見た目を再現
 */
export function SearchAlbumCard({
  id,
  title,
  ownerId,
  ownerName,
  ownerHandle,
  ownerIconURL,
  createdAt,
  firstImageUrl,
}: SearchAlbumCardProps) {
  const displayTitle = title?.trim() || "無題";
  const displayName = ownerName || "名前未設定";
  const displayHandle = ownerHandle ? `@${ownerHandle}` : "";
  const formattedDate = formatDate(createdAt);

  return (
    <article className="py-4 space-y-3">
      {/* ヘッダー: オーナー情報 */}
      <header className="flex items-center gap-3">
        <Link href={`/user/${ownerHandle || ownerId || ""}`} className="shrink-0" aria-label="プロフィールへ">
          <Avatar src={ownerIconURL} size={48} interactive={false} withBorder={false} className="rounded-full" />
        </Link>
        <div className="min-w-0">
          <Link
            href={`/user/${ownerHandle || ownerId || ""}`}
            className="flex flex-col leading-tight"
            title={`${displayName} ${displayHandle}`.trim()}
          >
            <span className="text-base font-semibold truncate">{displayName}</span>
            {displayHandle && <span className="text-sm text-muted/80">{displayHandle}</span>}
            {formattedDate && <span className="text-xs text-muted/80">{formattedDate}</span>}
          </Link>
        </div>
      </header>

      {/* 画像 */}
      <Link href={`/album/${id}`} className="block">
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            overflow: "hidden",
            borderRadius: 6,
          }}
          className="surface-alt"
        >
          {firstImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstImageUrl}
              alt={displayTitle}
              loading="lazy"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm fg-subtle">
              No Image
            </div>
          )}
        </div>
      </Link>

      {/* タイトル */}
      <h3 className="text-base font-semibold">
        <Link href={`/album/${id}`}>{displayTitle}</Link>
      </h3>
    </article>
  );
}

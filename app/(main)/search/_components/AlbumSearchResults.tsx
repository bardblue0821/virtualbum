"use client";
import React from "react";
import { SearchAlbumCard } from "@/components/features/search/SearchAlbumCard";
import { AlbumHit } from "@/lib/db/repositories/search.repository";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface AlbumSearchResultsProps {
  albums: AlbumHit[];
  loading: boolean;
  hasQuery: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function AlbumSearchResults({
  albums,
  loading,
  hasQuery,
  hasMore,
  loadingMore,
  sentinelRef,
}: AlbumSearchResultsProps) {
  return (
    <section>
      <h2 className="font-medium mb-2">
        アルバム {albums.length ? `(${albums.length})` : ""}
      </h2>
      {!hasQuery && <p className="text-sm fg-subtle">キーワードを入力してください</p>}
      {hasQuery && albums.length === 0 && !loading && (
        <p className="text-sm fg-subtle">該当なし</p>
      )}
      <div className="divide-y divide-line">
        {albums.map((a) => (
          <SearchAlbumCard
            key={a.id}
            id={a.id}
            title={a.title}
            ownerId={a.ownerId}
            ownerName={a.ownerName}
            ownerHandle={a.ownerHandle}
            ownerIconURL={a.ownerIconURL}
            createdAt={a.createdAt}
            firstImageUrl={a.firstImageUrl}
          />
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-4" />}
      {loadingMore && <LoadingSpinner size="xs" />}
    </section>
  );
}

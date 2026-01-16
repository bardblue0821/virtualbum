"use client";
import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch, useSearchHistory, useInfiniteScroll } from "./_lib/hooks";
import {
  CategoryTabs,
  SearchHistory,
  UserSearchResults,
  AlbumSearchResults,
  TagSearchResults,
} from "./_components";

export default function SearchPage() {
  const searchParams = useSearchParams();
  
  // Custom hooks
  const {
    q,
    setQ,
    category,
    setCategory,
    loading,
    err,
    normalized,
    users,
    userHasMore,
    userLoadingMore,
    loadMoreUsers,
    albums,
    albumHasMore,
    albumLoadingMore,
    loadMoreAlbums,
    userTagResults,
    albumTagResults,
  } = useSearch();

  const { history, saveHistory, clearHistory } = useSearchHistory();

  // URLパラメータから検索クエリを取得
  useEffect(() => {
    const query = searchParams?.get('q');
    if (query) {
      setQ(query);
    }
  }, [searchParams, setQ]);

  // Infinite scroll refs
  const userSentinelRef = useInfiniteScroll(loadMoreUsers);
  const albumSentinelRef = useInfiniteScroll(loadMoreAlbums);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (normalized) saveHistory(normalized);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-semibold sticky top-0 z-10 bg-background py-2 border-b border-line">
        検索
      </h1>
      
      <div>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="ユーザー名 / @ハンドル / アルバム名 / 説明 / コメント"
          className="w-full input-underline text-sm"
        />
        
        {/* カテゴリ選択 */}
        {normalized && (
          <CategoryTabs category={category} onCategoryChange={setCategory} />
        )}
        
        {/* 検索履歴 */}
        {!normalized && (
          <SearchHistory
            history={history}
            onSelect={setQ}
            onClear={clearHistory}
          />
        )}
        
        {loading && <p className="text-xs fg-subtle mt-2">検索中...</p>}
        {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ユーザー検索結果 */}
        {(category === 'all' || category === 'users') && (
          <UserSearchResults
            users={users}
            loading={loading}
            hasQuery={!!normalized}
            hasMore={userHasMore}
            loadingMore={userLoadingMore}
            sentinelRef={userSentinelRef}
          />
        )}

        {/* アルバム検索結果 */}
        {(category === 'all' || category === 'albums') && (
          <AlbumSearchResults
            albums={albums}
            loading={loading}
            hasQuery={!!normalized}
            hasMore={albumHasMore}
            loadingMore={albumLoadingMore}
            sentinelRef={albumSentinelRef}
          />
        )}

        {/* タグ検索結果 */}
        <TagSearchResults
          userTagResults={userTagResults}
          albumTagResults={albumTagResults}
          loading={loading}
          hasQuery={!!normalized}
          showUserTags={category === 'all' || category === 'userTags'}
          showAlbumTags={category === 'all' || category === 'albumTags'}
        />
      </div>
    </div>
  );
}

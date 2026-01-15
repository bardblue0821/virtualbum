"use client";
import React from "react";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import DeleteConfirmModal from "@/components/album/DeleteConfirmModal";
import ReportConfirmModal from "@/components/album/ReportConfirmModal";
import { useTimelineFeed } from "./_lib/hooks/useTimelineFeed";
import { useTimelineActions } from "./_lib/hooks/useTimelineActions";
import { useTimelineModals } from "./_lib/hooks/useTimelineModals";
import { useTimelineFilters } from "./_lib/hooks/useTimelineFilters";
import { TimelineFilters } from "./_components/TimelineFilters";

function toMillis(v: any): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  if (typeof v === "object" && typeof v.seconds === "number") return v.seconds * 1000;
  if (typeof v === "number") return v > 1e12 ? v : v * 1000;
  return 0;
}

export default function TimelinePage() {
  const { user } = useAuthUser();

  // Feed data and subscriptions
  const feed = useTimelineFeed(user);

  // Modals (delete, report, undo repost)
  const modals = useTimelineModals({
    user,
    setRows: feed.setRows,
    updateRowByAlbumId: feed.updateRowByAlbumId,
    cleanupSubscriptionForAlbum: feed.cleanupSubscriptionForAlbum,
    resortTimeline: feed.resortTimeline,
    setError: feed.setError,
  });

  // Actions (like, reaction, repost, comment)
  const actions = useTimelineActions({
    user,
    rows: feed.rows,
    rowsRef: feed.rowsRef,
    setRows: feed.setRows,
    updateRowByAlbumId: feed.updateRowByAlbumId,
    resortTimeline: feed.resortTimeline,
    userCacheRef: feed.userCacheRef,
    setUndoRepostTargetAlbumId: modals.setUndoRepostTargetAlbumId,
    setConfirmRepostTargetAlbumId: modals.setConfirmRepostTargetAlbumId,
  });

  // Filters
  const filters = useTimelineFilters({
    rows: feed.rows,
    user,
    friendSet: feed.friendSet,
    watchSet: feed.watchSet,
  });

  if (feed.loading && feed.rows.length === 0) {
    return <div className="text-sm text-muted/80">読み込み中...</div>;
  }
  if (feed.error && feed.rows.length === 0) {
    return <div className="text-sm text-red-600">{feed.error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header: Title and Filter Button */}
      <div className="sticky top-0 z-10 bg-background py-2 border-b border-line flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">タイムライン</h1>
        {user && (
          <TimelineFilters
            filter={filters.filter}
            tagFilter={filters.tagFilter}
            showFilterPopover={filters.showFilterPopover}
            setShowFilterPopover={filters.setShowFilterPopover}
            filterPopoverRef={filters.filterPopoverRef}
            activeFilterCount={filters.activeFilterCount}
            handleFilterChange={filters.handleFilterChange}
            handleTagFilterChange={filters.handleTagFilterChange}
          />
        )}
      </div>

      {filters.filteredRows.length === 0 && (
        <p className="text-sm text-muted/80">対象アルバムがありません</p>
      )}

      {filters.filteredRows.length > 0 && (
        <div className="divide-y divide-line *:pb-12">
          {filters.filteredRows.map((row) => (
            <TimelineItem
              key={
                row.repostedBy?.createdAt
                  ? `repost:${row.album.id}:${toMillis(row.repostedBy?.createdAt)}`
                  : (row as any).imageAdded?.createdAt
                    ? `image:${row.album.id}:${toMillis((row as any).imageAdded?.createdAt)}`
                    : `base:${row.album.id}`
              }
              album={row.album}
              images={row.images}
              likeCount={row.likeCount}
              liked={row.liked}
              onLike={() => actions.handleToggleLike(row.album.id)}
              repostCount={row.repostCount}
              reposted={row.reposted}
              onToggleRepost={() => actions.handleToggleRepost(row.album.id)}
              currentUserId={user?.uid || undefined}
              onRequestDelete={(albumId) => modals.setDeleteTargetAlbumId(albumId)}
              onRequestReport={(albumId) => modals.setReportTargetAlbumId(albumId)}
              commentCount={row.commentCount}
              latestComment={row.latestComment}
              commentsPreview={row.commentsPreview}
              onCommentSubmit={user ? (text) => actions.handleSubmitComment(row.album.id, text) : undefined}
              reactions={row.reactions}
              onToggleReaction={(emoji) => actions.handleToggleReaction(row.album.id, emoji)}
              owner={row.owner ?? undefined}
              imageAdded={row.imageAdded}
              repostedBy={row.repostedBy}
              isFriend={!!(row.owner?.uid && feed.friendSet.has(row.owner.uid))}
              isWatched={!!(row.owner?.uid && feed.watchSet.has(row.owner.uid))}
              onVisibilityChange={feed.handleVisibilityChange}
            />
          ))}
        </div>
      )}

      {feed.error && feed.rows.length > 0 && (
        <div className="mt-4 text-sm text-red-600">{feed.error}</div>
      )}
      {feed.loadingMore && <div className="mt-4 text-sm text-muted/80">読み込み中...</div>}
      <div ref={feed.sentinelRef} className="h-px" />

      {/* Modals */}
      <DeleteConfirmModal
        open={!!modals.deleteTargetAlbumId}
        busy={modals.deleteBusy}
        onCancel={() => {
          if (!modals.deleteBusy) modals.setDeleteTargetAlbumId(null);
        }}
        onConfirm={() => {
          if (!modals.deleteBusy) modals.handleConfirmDelete();
        }}
      />
      <ReportConfirmModal
        open={!!modals.reportTargetAlbumId}
        busy={modals.reportBusy}
        onCancel={() => {
          if (!modals.reportBusy) modals.setReportTargetAlbumId(null);
        }}
        onConfirm={() => {
          if (!modals.reportBusy) modals.handleConfirmReport();
        }}
      />

      {/* Undo Repost Modal */}
      {modals.undoRepostTargetAlbumId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded bg-background border border-line p-4 shadow-lg">
            <h3 className="text-sm font-semibold">リポストを取り消しますか？</h3>
            <p className="mt-2 text-xs text-muted/80">この操作はいつでもやり直せます。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded bg-surface-weak border border-line px-3 py-1 text-xs"
                onClick={() => {
                  if (!modals.undoRepostBusy) modals.setUndoRepostTargetAlbumId(null);
                }}
                disabled={modals.undoRepostBusy}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="rounded bg-emerald-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                onClick={() => {
                  if (!modals.undoRepostBusy) modals.handleConfirmUndoRepost();
                }}
                disabled={modals.undoRepostBusy}
              >
                {modals.undoRepostBusy ? "処理中..." : "取り消す"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Repost Modal */}
      {modals.confirmRepostTargetAlbumId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded bg-background border border-line p-4 shadow-lg">
            <h3 className="text-sm font-semibold">リポストしますか？</h3>
            <p className="mt-2 text-xs text-muted/80">このアルバムをあなたのフォロワーに共有します。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded bg-surface-weak border border-line px-3 py-1 text-xs"
                onClick={() => {
                  if (!modals.confirmRepostBusy) modals.setConfirmRepostTargetAlbumId(null);
                }}
                disabled={modals.confirmRepostBusy}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="rounded bg-emerald-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                onClick={() => {
                  if (!modals.confirmRepostBusy) modals.handleConfirmRepost();
                }}
                disabled={modals.confirmRepostBusy}
              >
                {modals.confirmRepostBusy ? "処理中..." : "リポスト"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

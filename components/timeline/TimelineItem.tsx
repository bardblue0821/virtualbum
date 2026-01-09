"use client";
import React, { useState, useRef, useEffect } from "react";
import Avatar from "../profile/Avatar";
import { Button } from "../ui/Button";
import AlbumActionsMenu from "../album/AlbumActionsMenu";
import ShareMenu from "../album/ShareMenu";
import { useTimelineItemVisibility } from "@/src/hooks/useTimelineItemVisibility";

// サブコンポーネント
import { ImageGrid } from "./ImageGrid";
import { ActionBar } from "./ActionBar";
import { ReactionSection } from "./ReactionSection";
import { CommentPreview } from "./CommentPreview";
import { toDate, formatDateTime } from "./utils";

// 型定義
import type { TimelineItemProps } from "./types";

/**
 * タイムラインのアイテムコンポーネント
 * 773行 → 約200行にリファクタリング
 */
export function TimelineItem(props: TimelineItemProps) {
  const {
    album,
    images,
    likeCount,
    liked,
    onLike,
    repostCount = 0,
    reposted = false,
    onToggleRepost,
    currentUserId,
    onRequestDelete,
    onRequestReport,
    commentCount = 0,
    commentsPreview = [],
    onCommentSubmit,
    submitting,
    reactions = [],
    onToggleReaction,
    owner,
    imageAdded,
    repostedBy,
    isFriend,
    isWatched,
    onVisibilityChange,
  } = props;

  const isOwner = !!(currentUserId && album.ownerId === currentUserId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // フレンド限定アルバムで、オーナーでもフレンドでもない場合は一部操作を制限
  const isFriendsOnly = album.visibility === 'friends';
  const canInteract = isOwner || isFriend || !isFriendsOnly;

  async function handleCommentSubmit() {
    if (!onCommentSubmit || !text.trim()) return;
    setBusy(true);
    try {
      await onCommentSubmit(text.trim());
      setText("");
      setShowCommentBox(false);
    } finally {
      setBusy(false);
    }
  }

  // 可視判定フック
  const { ref: visibilityRef } = useTimelineItemVisibility(
    album.id,
    onVisibilityChange
  );

  // コメント欄が開いたら自動でフォーカス
  useEffect(() => {
    if (showCommentBox && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [showCommentBox]);

  // コメント欄を開く時は必ずtrueにする
  const handleToggleCommentBox = () => setShowCommentBox(true);

  return (
    <article ref={visibilityRef} className="py-4 space-y-3">
      {/* ヘッダー: リポスト/画像追加バナー + オーナー情報 */}
      <Header
        album={album}
        owner={owner}
        repostedBy={repostedBy}
        imageAdded={imageAdded}
        currentUserId={currentUserId}
        isOwner={isOwner}
        isFriend={isFriend}
        isWatched={isWatched}
        onRequestDelete={onRequestDelete}
        onRequestReport={onRequestReport}
      />

      {/* 画像グリッド */}
      <div className={`overflow-hidden ${isFriend ? 'bg-friend/10' : isWatched ? 'bg-watch/10' : ''}`}>
        <ImageGrid images={images} albumId={album.id} />
      </div>

      {/* アクションバー + リアクション (一行表示) */}
      <div className="flex items-center gap-4 flex-wrap">
        <ActionBar
          albumId={album.id}
          likeCount={likeCount}
          liked={liked}
          onLike={() => onLike?.()}
          repostCount={repostCount}
          reposted={reposted}
          onToggleRepost={onToggleRepost}
          repostDisabled={!canInteract}
          commentCount={commentCount}
          showCommentBox={showCommentBox}
          onToggleCommentBox={handleToggleCommentBox}
          hasCommentSubmit={!!onCommentSubmit}
          currentUserId={currentUserId}
        />
        <ReactionSection
          albumId={album.id}
          reactions={reactions}
          onToggleReaction={onToggleReaction}
          maxReactions={30}
        />
      </div>

      {/* コメントプレビュー */}
      <CommentPreview comments={commentsPreview} />

      {/* コメント入力欄 */}
      {onCommentSubmit && showCommentBox && (
        <div className="flex items-center gap-2">
          <input
            ref={commentInputRef}
            aria-label="コメント入力"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim() && !busy && !submitting) {
                e.preventDefault();
                handleCommentSubmit();
              }
            }}
            className="flex-1 input-underline text-sm"
            placeholder="コメントを書く（Ctrl+Enterで送信）"
          />
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handleCommentSubmit}
            disabled={busy || submitting || !text.trim()}
          >
            送信
          </Button>
        </div>
      )}
    </article>
  );
}

// ヘッダーコンポーネント
interface HeaderProps {
  album: TimelineItemProps['album'];
  owner?: TimelineItemProps['owner'];
  repostedBy?: TimelineItemProps['repostedBy'];
  imageAdded?: TimelineItemProps['imageAdded'];
  currentUserId?: string;
  isOwner: boolean;
  isFriend?: boolean;
  isWatched?: boolean;
  onRequestDelete?: (albumId: string) => void;
  onRequestReport?: (albumId: string) => void;
}

function Header({
  album,
  owner,
  repostedBy,
  imageAdded,
  currentUserId,
  isOwner,
  isFriend,
  isWatched,
  onRequestDelete,
  onRequestReport,
}: HeaderProps) {
  const isFriendsOnly = album.visibility === 'friends';

  return (
    <header className="space-y-2">
      {/* リポストバナー */}
      {repostedBy?.userId && (
        <ActivityBanner
          userId={repostedBy.userId}
          user={repostedBy.user}
          createdAt={repostedBy.createdAt}
          currentUserId={currentUserId}
          actionText="がリポストしました"
          selfActionText="がリポストしました"
        />
      )}

      {/* 画像追加バナー */}
      {imageAdded?.userId && (
        <ActivityBanner
          userId={imageAdded.userId}
          user={imageAdded.user}
          createdAt={imageAdded.createdAt}
          actionText="さんが画像を追加しました"
        />
      )}

      {/* オーナー情報 */}
      <div className="flex items-center gap-3">
        <a href={`/user/${owner?.handle || album.ownerId}`} className="shrink-0" aria-label="プロフィールへ">
          <Avatar src={owner?.iconURL || undefined} size={56} interactive={false} withBorder={false} className="rounded-full" />
        </a>
        <div className="min-w-0">
          <a
            href={`/user/${owner?.handle || album.ownerId}`}
            className="flex flex-col leading-tight"
            title={`${owner?.displayName || '名前未設定'} ${owner?.handle ? `@${owner.handle}` : ''}`.trim()}
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold truncate">{owner?.displayName || '名前未設定'}</span>
              {isFriend && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-friend text-white shrink-0" title="フレンド">フレンド</span>
              )}
              {isWatched && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-watch text-white shrink-0" title="ウォッチ中">ウォッチ中</span>
              )}
            </div>
            <span className="text-sm text-muted/80">{owner?.handle ? `@${owner.handle}` : 'ハンドル未設定'}</span>
            {formatDateTime(toDate(album.createdAt)) && (
              <span className="text-xs text-muted/80">{formatDateTime(toDate(album.createdAt))}</span>
            )}
          </a>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ShareMenu 
            albumId={album.id} 
            albumTitle={album.title || null} 
            disabled={isFriendsOnly && !isOwner && !isFriend} 
          />
          <AlbumActionsMenu
            albumId={album.id}
            albumOwnerId={album.ownerId}
            currentUserId={currentUserId}
            onRequestDelete={onRequestDelete}
            onRequestReport={onRequestReport}
          />
        </div>
      </div>

      {/* アルバムタイトル */}
      {album.title && (
        <h3 className="text-base font-semibold flex items-center gap-2">
          <a href={`/album/${album.id}`}>{album.title}</a>
          {isFriendsOnly && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-muted/20 text-muted shrink-0" title="フレンド限定">🔒 フレンド限定</span>
          )}
        </h3>
      )}
    </header>
  );
}

// アクティビティバナー（リポスト/画像追加）
interface ActivityBannerProps {
  userId: string;
  user?: { uid: string; handle: string | null; iconURL?: string | null; displayName?: string };
  createdAt?: unknown;
  currentUserId?: string;
  actionText: string;
  selfActionText?: string;
}

function ActivityBanner({ userId, user, createdAt, currentUserId, actionText, selfActionText }: ActivityBannerProps) {
  const isSelf = currentUserId && userId === currentUserId;
  const displayName = user?.displayName || (user?.handle ? `@${user.handle}` : userId.slice(0, 6));
  const timeText = formatDateTime(toDate(createdAt as Parameters<typeof toDate>[0]));

  return (
    <div className="flex items-center gap-2">
      <a href={`/user/${user?.handle || userId}`} className="shrink-0" aria-label="プロフィールへ">
        <Avatar src={user?.iconURL || undefined} size={28} interactive={false} withBorder={false} className="rounded-full" />
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm truncate">
            {isSelf ? (
              <>
                <span className="font-medium">あなた</span>
                <span className="text-muted/80"> {selfActionText || actionText}</span>
              </>
            ) : (
              <>
                <span className="font-medium">{displayName}</span>
                <span className="text-muted/80"> {actionText}</span>
              </>
            )}
          </span>
          {timeText && (
            <span className="text-xs text-muted/80 shrink-0">{timeText}</span>
          )}
        </div>
      </div>
    </div>
  );
}

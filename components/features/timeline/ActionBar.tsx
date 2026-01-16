"use client";
import React, { useState, useMemo, useEffect } from "react";
import { HeartIcon } from "@/components/icons/HeartIcon";
import { ChatIcon } from "@/components/icons/ChatIcon";
import { RepostIcon } from "@/components/icons/RepostIcon";
import { UserListPopover, UserListItem } from "./UserListPopover";
import { listLikersByAlbum } from "@/lib/db/repositories/like.repository";
import { listRepostersByAlbum } from "@/lib/db/repositories/repost.repository";
import { getUser } from "@/lib/db/repositories/user.repository";

interface ActionBarProps {
  albumId: string;
  // Like
  likeCount: number;
  liked: boolean;
  onLike: () => void;
  // Repost
  repostCount: number;
  reposted: boolean;
  onToggleRepost?: () => void;
  repostDisabled?: boolean;
  // Comment
  commentCount: number;
  showCommentBox: boolean;
  onToggleCommentBox: () => void;
  hasCommentSubmit: boolean;
  // User context
  currentUserId?: string;
}

/**
 * いいね、リポスト、コメントボタンのアクションバー
 */
export function ActionBar({
  albumId,
  likeCount,
  liked,
  onLike,
  repostCount,
  reposted,
  onToggleRepost,
  repostDisabled = false,
  commentCount,
  showCommentBox,
  onToggleCommentBox,
  hasCommentSubmit,
  currentUserId,
}: ActionBarProps) {
  // Likers popover state
  const [likersOpen, setLikersOpen] = useState(false);
  const [likersLoading, setLikersLoading] = useState(false);
  const [likers, setLikers] = useState<UserListItem[] | undefined>(undefined);

  // Reposters popover state
  const [repostersOpen, setRepostersOpen] = useState(false);
  const [repostersLoading, setRepostersLoading] = useState(false);
  const [reposters, setReposters] = useState<UserListItem[] | undefined>(undefined);

  // Current user info for optimistic display
  const [me, setMe] = useState<UserListItem | null>(null);

  async function ensureMe() {
    if (!currentUserId || me) return;
    try {
      const u = await getUser(currentUserId);
      setMe(u ? { 
        uid: currentUserId, 
        displayName: u.displayName ?? null, 
        handle: u.handle ?? null, 
        iconURL: u.iconURL ?? null 
      } : { uid: currentUserId });
    } catch {
      // ignore
    }
  }

  async function ensureLikers() {
    if (likers || likersLoading) return;
    setLikersLoading(true);
    try {
      const list = await listLikersByAlbum(albumId, 20);
      setLikers(list.map(u => ({
        uid: u.uid,
        displayName: u.displayName,
        handle: u.handle,
        iconURL: u.iconURL
      })));
    } finally {
      setLikersLoading(false);
    }
  }

  async function ensureReposters() {
    if (reposters || repostersLoading) return;
    setRepostersLoading(true);
    try {
      const list = await listRepostersByAlbum(albumId, 20);
      setReposters(list.map(u => ({
        uid: u.uid,
        displayName: u.displayName,
        handle: u.handle,
        iconURL: u.iconURL
      })));
    } finally {
      setRepostersLoading(false);
    }
  }

  // 楽観表示: 直後のホバーでまだ取得前でも、自分のアクションを表示に反映
  const viewLikers = useMemo(() => {
    const base = likers ? [...likers] : [];
    if (liked && currentUserId && !base.some(u => u.uid === currentUserId)) {
      base.unshift({ 
        uid: currentUserId, 
        displayName: me?.displayName || 'あなた', 
        handle: me?.handle ?? null, 
        iconURL: me?.iconURL || undefined 
      });
    }
    return base;
  }, [likers, liked, currentUserId, me]);

  const viewReposters = useMemo(() => {
    const base = reposters ? [...reposters] : [];
    if (reposted && currentUserId && !base.some(u => u.uid === currentUserId)) {
      base.unshift({ 
        uid: currentUserId, 
        displayName: me?.displayName || 'あなた', 
        handle: me?.handle ?? null, 
        iconURL: me?.iconURL || undefined 
      });
    }
    return base;
  }, [reposters, reposted, currentUserId, me]);

  // アクション直後に自分のプロフィールを用意
  useEffect(() => {
    if ((liked || reposted) && currentUserId && !me) {
      ensureMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liked, reposted, currentUserId]);

  return (
    <div className="flex items-center gap-3">
      {/* Like with hover popover */}
      <div
        className="relative flex items-center gap-1"
        onMouseEnter={() => { setLikersOpen(true); ensureLikers(); ensureMe(); }}
        onMouseLeave={() => setLikersOpen(false)}
      >
        <button
          aria-label={liked ? "いいね済み" : "いいね"}
          aria-pressed={liked}
          title={liked ? "いいね済み" : "いいね"}
          className={`${liked ? "text-pink-600" : "text-muted"}`}
          onClick={onLike}
        >
          <HeartIcon filled={liked} size={20} />
        </button>
        <span className="text-xs text-muted/80">{likeCount}</span>
        {likersOpen && (
          <UserListPopover
            title="いいねした人"
            users={viewLikers}
            loading={likersLoading}
          />
        )}
      </div>

      {/* Repost with hover popover */}
      <div
        className="relative flex items-center gap-1"
        onMouseEnter={() => { setRepostersOpen(true); ensureReposters(); ensureMe(); }}
        onMouseLeave={() => setRepostersOpen(false)}
      >
        <button
          aria-label={reposted ? "リポスト済み" : "リポスト"}
          aria-pressed={reposted}
          title={reposted ? "リポスト済み" : "リポスト"}
          className={`${reposted ? "text-green-600" : "text-muted"} ${repostDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => { 
            if (repostDisabled) return; 
            onToggleRepost?.(); 
          }}
        >
          <RepostIcon filled={reposted} size={20} />
        </button>
        <span className="text-xs text-muted/80">{repostCount}</span>
        {repostersOpen && (
          <UserListPopover
            title="リポストした人"
            users={viewReposters}
            loading={repostersLoading}
          />
        )}
      </div>

      {/* Comment toggle */}
      {hasCommentSubmit && (
        <button
          type="button"
          aria-label="コメント入力を開閉"
          title="コメントする"
          className={`text-muted ${showCommentBox ? 'opacity-100' : 'opacity-80'}`}
          onClick={onToggleCommentBox}
        >
          <ChatIcon size={20} />
        </button>
      )}
      <span className="text-xs text-muted/80">{commentCount}</span>
    </div>
  );
}

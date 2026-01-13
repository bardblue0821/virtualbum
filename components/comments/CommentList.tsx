"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getUser, UserDoc } from "../../lib/repos/userRepo";
import { Button, IconButton } from "../ui/Button";

export interface CommentViewModel {
  id: string;
  body: string;
  userId: string;
  createdAt?: any;
  isEditing?: boolean;
}

interface CommentListProps {
  comments: CommentViewModel[];
  currentUserId?: string | null;
  albumOwnerId?: string;
  onEditRequest?: (commentId: string) => void;
  onEditChange?: (commentId: string, value: string) => void;
  onEditSave?: (commentId: string) => void;
  onEditCancel?: () => void;
  onDelete?: (commentId: string) => void;
  editingCommentId?: string | null;
  editingValue?: string;
  canManage?: (comment: CommentViewModel) => boolean;
}

function formatTimestamp(ts: any): string {
  if (!ts) return "";
  try {
    let d: Date;
    if (ts instanceof Date) {
      d = ts;
    } else if (typeof ts.toDate === "function") {
      d = ts.toDate();
    } else {
      d = new Date(ts);
    }
    return d.toLocaleString();
  } catch {
    return "";
  }
}

export function CommentList({
  comments,
  currentUserId,
  albumOwnerId,
  onEditRequest,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
  editingCommentId,
  editingValue,
  canManage,
}: CommentListProps) {
  const [userMap, setUserMap] = useState<Record<string, UserDoc | null | undefined>>({});

  // コメントのユーザー情報を解決（アイコン/ハンドル/表示名）
  useEffect(() => {
    const uids = Array.from(new Set((comments || []).map(c => c.userId).filter(Boolean)));
    const missing = uids.filter(uid => !(uid in userMap));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(missing.map(async (uid) => {
        try {
          const u = await getUser(uid);
          return [uid, u] as const;
        } catch {
          return [uid, null] as const;
        }
      }));
      if (cancelled) return;
      setUserMap(prev => {
        const next = { ...prev };
        for (const [uid, u] of entries) next[uid] = u;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [comments, userMap]);

  const decideCanManage = (comment: CommentViewModel) => {
    if (typeof canManage === "function") return canManage(comment);
    return comment.userId === currentUserId || (!!albumOwnerId && currentUserId === albumOwnerId);
  };

  // コメントを新しい順にソート
  const sortedComments = useMemo(() => {
    if (!comments || comments.length === 0) return [];
    return [...comments].sort((a, b) => {
      const getTime = (ts: any): number => {
        if (!ts) return 0;
        if (ts instanceof Date) return ts.getTime();
        if (typeof ts.toDate === "function") return ts.toDate().getTime();
        if (typeof ts === 'number') return ts;
        return new Date(ts).getTime() || 0;
      };
      return getTime(b.createdAt) - getTime(a.createdAt);
    });
  }, [comments]);

  if (!comments || comments.length === 0) {
    return <p className="text-sm fg-subtle">コメントなし</p>;
  }

  return (
    <ul className="space-y-2 mb-3">
      {sortedComments.map((comment) => {
        const isEditing = editingCommentId === comment.id;
        const manageable = decideCanManage(comment);
        const u = userMap[comment.userId];
        const atName = u?.handle ? `@${u.handle}` : `@${comment.userId.slice(0,6)}`;
        const isOwner = comment.userId === albumOwnerId;
        return (
          <li key={comment.id} className="space-y-2 border-b border-line py-2 text-sm">
            {/* ヘッダー: アイコン / ハンドルネーム / ＠ネーム / 時刻 */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {/* アルバムオーナーの王冠アイコン（アイコンの上に表示） */}
                {isOwner && (
                  <span 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-yellow-500 drop-shadow-sm" 
                    style={{ fontSize: '14px' }}
                    title="アルバムオーナー"
                    aria-label="アルバムオーナー"
                  >
                    👑
                  </span>
                )}
                {u?.iconURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.iconURL} alt="" className="h-12 w-12 rounded-md object-cover" />
                ) : (
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-md surface-alt text-[13px] fg-muted">
                    {(u?.displayName?.[0] || '?')}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className="font-medium text-foreground truncate leading-tight">{u?.displayName || "不明なユーザー"}</span>
                <span className="text-[11px] text-muted truncate leading-tight">{atName}</span>
                {formatTimestamp(comment.createdAt) && (
                  <span className="text-[11px] text-muted truncate leading-tight">{formatTimestamp(comment.createdAt)}</span>
                )}
              </div>
            </div>

            {!isEditing && <p className="whitespace-pre-line wrap-break-word text-foreground">{comment.body}</p>}
            {isEditing && (
              <textarea
                value={editingValue ?? ""}
                onChange={(e) => onEditChange?.(comment.id, e.target.value)}
                className="w-full rounded border px-2 py-1"
                rows={3}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {manageable && (
                <div className="flex gap-2 text-xs">
                  {!isEditing && (
                    <>
                      <IconButton
                        type="button"
                        onClick={() => onEditRequest?.(comment.id)}
                        variant="ghost"
                        size="xs"
                        className="border-0 bg-transparent hover:bg-transparent px-1! py-1! text-foreground/80 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
                        aria-label="編集"
                        title="編集"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/>
                        </svg>
                      </IconButton>
                      <IconButton
                        type="button"
                        onClick={() => onDelete?.(comment.id)}
                        variant="ghost"
                        size="xs"
                        className="border-0 bg-transparent hover:bg-transparent px-1! py-1! text-red-600 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
                        aria-label="削除"
                        title="削除"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/>
                          <path d="M14 11v6"/>
                          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </IconButton>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <Button
                        type="button"
                        onClick={() => onEditSave?.(comment.id)}
                        disabled={!editingValue?.trim()}
                        variant="accent"
                        size="xs"
                      >
                        保存
                      </Button>
                      <Button type="button" onClick={() => onEditCancel?.()} variant="ghost" size="xs">
                        キャンセル
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

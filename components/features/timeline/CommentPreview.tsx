"use client";
import React from "react";
import Avatar from "@/components/features/profile/Avatar";
import type { CommentPreviewData } from "./types";
import { toDate, formatDateTime, truncateText } from "./utils";

interface CommentPreviewProps {
  comments: CommentPreviewData[];
  maxComments?: number;
}

/**
 * コメントプレビュー表示（最新3件まで）
 */
export function CommentPreview({ comments, maxComments = 3 }: CommentPreviewProps) {
  if (!comments || comments.length === 0) return null;

  return (
    <div className="mt-2 border-l border-line pl-3 space-y-2">
      {comments.slice(0, maxComments).map((c, idx) => (
        <CommentRow key={idx} comment={c} />
      ))}
    </div>
  );
}

function CommentRow({ comment }: { comment: CommentPreviewData }) {
  const u = comment.user;
  const name = u?.displayName || '名前未設定';
  const icon = u?.iconURL || undefined;
  const text = truncateText(comment.body, 30);
  const timeText = formatDateTime(toDate(comment.createdAt));

  return (
    <div className="flex items-center gap-3">
      <a 
        href={`/user/${u?.handle || comment.userId}`} 
        className="shrink-0" 
        aria-label="プロフィールへ"
      >
        <Avatar 
          src={icon} 
          size={40} 
          interactive={false} 
          withBorder={false} 
          className="rounded-full" 
        />
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 truncate">
          <a 
            href={`/user/${u?.handle || comment.userId}`} 
            className="text-sm font-medium truncate"
          >
            {name}
          </a>
          {u?.handle && (
            <span className="text-xs text-muted/80 shrink-0">@{u.handle}</span>
          )}
          {timeText && (
            <span className="text-xs text-muted/80 shrink-0">{timeText}</span>
          )}
        </div>
        <p className="text-sm truncate">{text}</p>
      </div>
    </div>
  );
}

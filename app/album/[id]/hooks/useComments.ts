"use client";
import { useState, useCallback } from "react";
import { translateError } from "@/lib/errors";
import { isRateLimitError } from "@/lib/rateLimit";
import { addComment, updateComment, deleteComment } from "@/lib/repos/commentRepo";
import type { CommentRecord } from "./useAlbumData";

export interface UseCommentsResult {
  editingCommentId: string | null;
  editingCommentBody: string;
  commentText: string;
  commenting: boolean;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  beginEditComment: (commentId: string) => void;
  cancelEditComment: () => void;
  saveEditComment: (commentId: string) => Promise<void>;
  handleDeleteComment: (id: string) => Promise<void>;
  submitComment: () => Promise<void>;
}

export function useComments(
  albumId: string | undefined,
  userId: string | undefined,
  comments: CommentRecord[],
  isOwner: boolean,
  isFriend: boolean,
  isWatcher: boolean,
  isPrivate: boolean,
  setError: (error: string | null) => void,
  toast: { error: (msg: string) => void }
): UseCommentsResult {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);

  const beginEditComment = useCallback((commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;
    setEditingCommentId(target.id);
    setEditingCommentBody(target.body ?? "");
  }, [comments]);

  const cancelEditComment = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentBody("");
  }, []);

  const saveEditComment = useCallback(async (commentId: string) => {
    if (!commentId || !editingCommentBody.trim()) return;
    try {
      await updateComment(commentId, editingCommentBody.trim());
      cancelEditComment();
    } catch (e: any) {
      setError(translateError(e));
    }
  }, [editingCommentBody, cancelEditComment, setError]);

  const handleDeleteComment = useCallback(async (id: string) => {
    if (!confirm("コメントを削除しますか？")) return;
    try {
      await deleteComment(id);
    } catch (e: any) {
      setError(translateError(e));
    }
  }, [setError]);

  const submitComment = useCallback(async () => {
    if (!userId || !albumId || !commentText.trim()) return;
    
    const canPost = isOwner || isFriend || (!isPrivate && isWatcher);
    if (!canPost) {
      setError('コメントする権限がありません');
      return;
    }
    
    setCommenting(true);
    setError(null);
    
    try {
      const token = await (window as any).__getIdToken?.();
      if (token) {
        const res = await fetch('/api/comments/add', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId, body: commentText.trim() }),
        });
        if (!res.ok) {
          await addComment(albumId, userId, commentText.trim());
        }
      } else {
        await addComment(albumId, userId, commentText.trim());
      }
      setCommentText("");
    } catch (e: any) {
      if (isRateLimitError(e)) {
        toast.error(e.message);
      } else {
        setError(translateError(e));
      }
    } finally {
      setCommenting(false);
    }
  }, [albumId, userId, commentText, isOwner, isFriend, isWatcher, isPrivate, setError, toast]);

  return {
    editingCommentId,
    editingCommentBody,
    commentText,
    commenting,
    setCommentText,
    beginEditComment,
    cancelEditComment,
    saveEditComment,
    handleDeleteComment,
    submitComment,
  };
}

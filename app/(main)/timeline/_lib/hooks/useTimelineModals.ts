"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import type { TimelineItemVM } from "@/lib/types/timeline";
import { deleteAlbum } from "@/lib/db/repositories/album.repository";
import { toggleRepost } from "@/lib/db/repositories/repost.repository";
import { translateError } from "@/lib/errors";
import { notifications } from "@mantine/notifications";

interface UseTimelineModalsProps {
  user: User | null | undefined;
  setRows: React.Dispatch<React.SetStateAction<TimelineItemVM[]>>;
  updateRowByAlbumId: (albumId: string, updater: (row: TimelineItemVM) => TimelineItemVM) => void;
  cleanupSubscriptionForAlbum: (albumId: string) => void;
  resortTimeline: () => void;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

interface UseTimelineModalsReturn {
  // Delete modal
  deleteTargetAlbumId: string | null;
  setDeleteTargetAlbumId: (id: string | null) => void;
  deleteBusy: boolean;
  handleConfirmDelete: () => Promise<void>;

  // Report modal
  reportTargetAlbumId: string | null;
  setReportTargetAlbumId: (id: string | null) => void;
  reportBusy: boolean;
  handleConfirmReport: () => Promise<void>;

  // Undo repost modal
  undoRepostTargetAlbumId: string | null;
  setUndoRepostTargetAlbumId: (id: string | null) => void;
  undoRepostBusy: boolean;
  handleConfirmUndoRepost: () => Promise<void>;

  // Confirm repost modal (new)
  confirmRepostTargetAlbumId: string | null;
  setConfirmRepostTargetAlbumId: (id: string | null) => void;
  confirmRepostBusy: boolean;
  handleConfirmRepost: () => Promise<void>;
}

/**
 * タイムラインの削除・通報・リポスト取り消しモーダルを管理
 */
export function useTimelineModals({
  user,
  setRows,
  updateRowByAlbumId,
  cleanupSubscriptionForAlbum,
  resortTimeline,
  setError,
}: UseTimelineModalsProps): UseTimelineModalsReturn {
  const router = useRouter();

  // Delete state
  const [deleteTargetAlbumId, setDeleteTargetAlbumId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Report state
  const [reportTargetAlbumId, setReportTargetAlbumId] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  // Undo repost state
  const [undoRepostTargetAlbumId, setUndoRepostTargetAlbumId] = useState<string | null>(null);
  const [undoRepostBusy, setUndoRepostBusy] = useState(false);

  // Confirm repost state (for new reposts)
  const [confirmRepostTargetAlbumId, setConfirmRepostTargetAlbumId] = useState<string | null>(null);
  const [confirmRepostBusy, setConfirmRepostBusy] = useState(false);

  const handleConfirmDelete = useCallback(async () => {
    const albumId = deleteTargetAlbumId;
    if (!albumId || !user?.uid) return;

    setDeleteBusy(true);
    try {
      await deleteAlbum(albumId);
      cleanupSubscriptionForAlbum(albumId);
      setRows((prev) => prev.filter((r) => r.album.id !== albumId));
      setDeleteTargetAlbumId(null);
      router.push("/timeline");
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteTargetAlbumId, user?.uid, cleanupSubscriptionForAlbum, setRows, router, setError]);

  const handleConfirmReport = useCallback(async () => {
    const albumId = reportTargetAlbumId;
    if (!albumId || !user) return;

    setReportBusy(true);
    try {
      const token = await user.getIdToken();
      const albumUrl = `${window.location.origin}/album/${encodeURIComponent(albumId)}`;
      const res = await fetch("/api/reports/album", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ albumId, albumUrl }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({} as any));
        const err = (json as any)?.error || "REPORT_FAILED";
        const hint = (json as any)?.hint as string | undefined;
        const missingEnv = (json as any)?.missingEnv as string | undefined;

        let msg = err;
        if (typeof err === "string" && err.startsWith("MISSING_ENV:")) {
          msg = `通報メール送信の設定が未完了です（${missingEnv || err.slice("MISSING_ENV:".length)}）`;
        }
        if (hint) msg = `${msg} / ${hint}`;
        throw new Error(msg);
      }
      setReportTargetAlbumId(null);
    } catch (e: any) {
      const msg = translateError(e);
      setError(msg);
      notifications.show({ color: "red", message: msg });
    } finally {
      setReportBusy(false);
    }
  }, [reportTargetAlbumId, user, setError]);

  const handleConfirmUndoRepost = useCallback(async () => {
    const albumId = undoRepostTargetAlbumId;
    if (!albumId || !user) return;

    setUndoRepostBusy(true);

    // Optimistic undo
    setRows((prev) => {
      const removed = prev.filter(
        (r) => !(r.album.id === albumId && (r.repostedBy as any)?.userId === user.uid)
      );
      return removed.map((r) =>
        r.album.id === albumId
          ? ({ ...r, reposted: false, repostCount: Math.max(0, (r.repostCount || 0) - 1) } as any)
          : r
      );
    });
    resortTimeline();

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/reposts/toggle", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ albumId, userId: user.uid }),
      });
      if (!res.ok) {
        await toggleRepost(albumId, user.uid);
      }
      setUndoRepostTargetAlbumId(null);
    } catch {
      // rollback
      updateRowByAlbumId(albumId, (r) => ({
        ...r,
        reposted: true,
        repostCount: (r.repostCount || 0) + 1,
      }));
      resortTimeline();
      setUndoRepostTargetAlbumId(null);
    } finally {
      setUndoRepostBusy(false);
    }
  }, [undoRepostTargetAlbumId, user, setRows, resortTimeline, updateRowByAlbumId]);

  // Confirm repost handler
  const handleConfirmRepost = useCallback(async () => {
    const albumId = confirmRepostTargetAlbumId;
    if (!albumId || !user) return;

    setConfirmRepostBusy(true);

    // Optimistic update
    updateRowByAlbumId(albumId, (r) => ({
      ...r,
      reposted: true,
      repostCount: (r.repostCount || 0) + 1,
    }));
    resortTimeline();

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/reposts/toggle", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ albumId, userId: user.uid }),
      });
      if (!res.ok) {
        throw new Error("Repost failed");
      }
      setConfirmRepostTargetAlbumId(null);
    } catch {
      // rollback
      updateRowByAlbumId(albumId, (r) => ({
        ...r,
        reposted: false,
        repostCount: Math.max(0, (r.repostCount || 0) - 1),
      }));
      resortTimeline();
      setConfirmRepostTargetAlbumId(null);
    } finally {
      setConfirmRepostBusy(false);
    }
  }, [confirmRepostTargetAlbumId, user, updateRowByAlbumId, resortTimeline]);

  return {
    deleteTargetAlbumId,
    setDeleteTargetAlbumId,
    deleteBusy,
    handleConfirmDelete,
    reportTargetAlbumId,
    setReportTargetAlbumId,
    reportBusy,
    handleConfirmReport,
    undoRepostTargetAlbumId,
    setUndoRepostTargetAlbumId,
    undoRepostBusy,
    handleConfirmUndoRepost,
    confirmRepostTargetAlbumId,
    setConfirmRepostTargetAlbumId,
    confirmRepostBusy,
    handleConfirmRepost,
  };
}

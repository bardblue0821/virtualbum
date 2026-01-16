"use client";
import { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { deleteAlbum } from '@/lib/db/repositories/album.repository';
import { translateError } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';
import type { AlbumRowData } from './useAlbumRows';

interface UseAlbumModalsProps {
  user: User | null | undefined;
  setOwnRows: React.Dispatch<React.SetStateAction<AlbumRowData[]>>;
  setJoinedRows: React.Dispatch<React.SetStateAction<AlbumRowData[]>>;
}

interface UseAlbumModalsReturn {
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
}

/**
 * アルバムの削除・通報モーダルの状態とハンドラーを管理するフック
 */
export function useAlbumModals({
  user,
  setOwnRows,
  setJoinedRows,
}: UseAlbumModalsProps): UseAlbumModalsReturn {
  const { show } = useToast();

  // Delete state
  const [deleteTargetAlbumId, setDeleteTargetAlbumId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Report state
  const [reportTargetAlbumId, setReportTargetAlbumId] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  // Delete album handler
  const handleConfirmDelete = useCallback(async () => {
    const albumId = deleteTargetAlbumId;
    if (!albumId || !user?.uid) return;

    setDeleteBusy(true);
    try {
      await deleteAlbum(albumId);
      setOwnRows((prev) => prev.filter((r) => r.album.id !== albumId));
      setJoinedRows((prev) => prev.filter((r) => r.album.id !== albumId));
      setDeleteTargetAlbumId(null);
    } catch (e: any) {
      const msg = translateError(e);
      show({ message: msg, variant: 'error' });
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteTargetAlbumId, user?.uid, setOwnRows, setJoinedRows, show]);

  // Report album handler
  const handleConfirmReport = useCallback(async () => {
    const albumId = reportTargetAlbumId;
    if (!albumId || !user) return;

    setReportBusy(true);
    try {
      const token = await user.getIdToken();
      const albumUrl = `${window.location.origin}/album/${encodeURIComponent(albumId)}`;
      const res = await fetch('/api/reports/album', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ albumId, albumUrl }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({} as any));
        const err = (json as any)?.error || 'REPORT_FAILED';
        const hint = (json as any)?.hint as string | undefined;
        const missingEnv = (json as any)?.missingEnv as string | undefined;
        let msg = err;
        if (typeof err === 'string' && err.startsWith('MISSING_ENV:')) {
          msg = `通報メール送信の設定が未完了です（${missingEnv || err.slice('MISSING_ENV:'.length)}）`;
        }
        if (hint) msg = `${msg} / ${hint}`;
        throw new Error(msg);
      }
      setReportTargetAlbumId(null);
    } catch (e: any) {
      const msg = translateError(e);
      show({ message: msg, variant: 'error' });
    } finally {
      setReportBusy(false);
    }
  }, [reportTargetAlbumId, user, show]);

  return {
    deleteTargetAlbumId,
    setDeleteTargetAlbumId,
    deleteBusy,
    handleConfirmDelete,
    reportTargetAlbumId,
    setReportTargetAlbumId,
    reportBusy,
    handleConfirmReport,
  };
}

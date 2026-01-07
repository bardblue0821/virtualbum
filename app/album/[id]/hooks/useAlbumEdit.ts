"use client";
import { useState, useCallback } from "react";
import { translateError } from "@/lib/errors";
import { updateAlbum, getAlbumSafe, deleteAlbum } from "@/lib/repos/albumRepo";
import type { AlbumRecord } from "./useAlbumData";

export interface UseAlbumEditResult {
  editTitle: string;
  editPlaceUrl: string;
  savingAlbum: boolean;
  showDeleteConfirm: boolean;
  deleting: boolean;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
  setEditPlaceUrl: React.Dispatch<React.SetStateAction<string>>;
  handleSaveAlbum: () => Promise<void>;
  handleChangeVisibility: (v: 'public' | 'friends') => Promise<void>;
  saveTitleIfChanged: () => Promise<void>;
  savePlaceUrlIfChanged: () => Promise<void>;
  handleInputKeyDownBlurOnEnter: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  askDeleteAlbum: () => void;
  confirmDeleteAlbum: () => Promise<void>;
  setShowDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useAlbumEdit(
  albumId: string | undefined,
  album: AlbumRecord | null,
  setAlbum: React.Dispatch<React.SetStateAction<AlbumRecord | null>>,
  setError: (error: string | null) => void,
  toast: { success: (msg: string) => void },
  router: { replace: (url: string) => void }
): UseAlbumEditResult {
  const [editTitle, setEditTitle] = useState(album?.title ?? "");
  const [editPlaceUrl, setEditPlaceUrl] = useState(album?.placeUrl ?? "");
  const [savingAlbum, setSavingAlbum] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveAlbum = useCallback(async () => {
    if (!albumId) return;
    setSavingAlbum(true);
    setError(null);
    try {
      await updateAlbum(albumId, { title: editTitle, placeUrl: editPlaceUrl });
      toast.success("保存しました");
      const updated = await getAlbumSafe(albumId);
      if (updated) setAlbum(updated as AlbumRecord);
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setSavingAlbum(false);
    }
  }, [albumId, editTitle, editPlaceUrl, setAlbum, setError, toast]);

  const handleChangeVisibility = useCallback(async (v: 'public' | 'friends') => {
    if (!albumId || !album) return;
    setSavingAlbum(true);
    setError(null);
    try {
      await updateAlbum(albumId, { visibility: v });
      
      // 公開→フレンド限定へ切り替え時は既存のリポストを無効化(削除)
      if (v === 'friends') {
        try {
          const { deleteRepostsByAlbum } = await import("@/lib/repos/repostRepo");
          await deleteRepostsByAlbum(albumId);
        } catch (e) {
          console.warn('deleteRepostsByAlbum failed', e);
        }
      }
      
      const updated = await getAlbumSafe(albumId);
      if (updated) setAlbum(updated as AlbumRecord);
      toast.success("保存しました");
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setSavingAlbum(false);
    }
  }, [albumId, album, setAlbum, setError, toast]);

  const saveTitleIfChanged = useCallback(async () => {
    if (!albumId) return;
    const current = (album?.title ?? "");
    const next = (editTitle ?? "").trim();
    if (next === current) return;
    
    setSavingAlbum(true);
    setError(null);
    try {
      await updateAlbum(albumId, { title: next });
      setAlbum((prev) => (prev ? { ...prev, title: next } : prev));
      toast.success("保存しました");
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setSavingAlbum(false);
    }
  }, [albumId, album?.title, editTitle, setAlbum, setError, toast]);

  const savePlaceUrlIfChanged = useCallback(async () => {
    if (!albumId) return;
    const current = (album?.placeUrl ?? "");
    const next = (editPlaceUrl ?? "").trim();
    if (next === current) return;
    
    setSavingAlbum(true);
    setError(null);
    try {
      await updateAlbum(albumId, { placeUrl: next });
      setAlbum((prev) => (prev ? { ...prev, placeUrl: next } : prev));
      toast.success("保存しました");
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setSavingAlbum(false);
    }
  }, [albumId, album?.placeUrl, editPlaceUrl, setAlbum, setError, toast]);

  const handleInputKeyDownBlurOnEnter = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
    }
  }, []);

  const askDeleteAlbum = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteAlbum = useCallback(async () => {
    if (!albumId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAlbum(albumId);
      try {
        sessionStorage.setItem(
          'app:toast',
          JSON.stringify({ message: 'アルバムを削除しました', variant: 'success', duration: 3000 })
        );
      } catch {}
      router.replace('/timeline');
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [albumId, setError, router]);

  return {
    editTitle,
    editPlaceUrl,
    savingAlbum,
    showDeleteConfirm,
    deleting,
    setEditTitle,
    setEditPlaceUrl,
    handleSaveAlbum,
    handleChangeVisibility,
    saveTitleIfChanged,
    savePlaceUrlIfChanged,
    handleInputKeyDownBlurOnEnter,
    askDeleteAlbum,
    confirmDeleteAlbum,
    setShowDeleteConfirm,
  };
}

"use client";
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useAlbumRows, type AlbumRowData, type UserRef, type CommentWithAlbumInfo, type ProfileStats } from './useAlbumRows';
import { useUploadedImages } from './useUploadedImages';
import { useAlbumActions } from './useAlbumActions';
import { useAlbumModals } from './useAlbumModals';
import type { PhotoItem } from '@/components/gallery/GalleryGrid';

// Re-export types for convenience
export type { AlbumRowData, UserRef, CommentWithAlbumInfo, ProfileStats };

export type TabType = 'own' | 'joined' | 'comments' | 'images' | 'likes';

interface ProfileData {
  uid: string;
  handle?: string | null;
  iconURL?: string | null;
  displayName?: string | null;
}

interface UseProfileTabsReturn {
  // Tab state
  listTab: TabType;
  setListTab: (tab: TabType) => void;

  // Stats
  stats: ProfileStats | null;
  likedCount: number;

  // Data
  ownRows: AlbumRowData[];
  joinedRows: AlbumRowData[];
  likedRows: AlbumRowData[];
  userComments: CommentWithAlbumInfo[] | null;

  // Uploaded images
  uploadedPhotos: PhotoItem[] | null;
  uploadedLoading: boolean;
  uploadedError: string | null;
  uploadedErrorLink: string | null;
  uploadedHasMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;

  // Loading states
  loadingExtra: boolean;
  extraError: string | null;
  likedLoading: boolean;
  likedError: string | null;

  // Album actions
  handleToggleLike: (tabType: 'own' | 'joined' | 'liked', index: number) => Promise<void>;
  handleToggleReaction: (tabType: 'own' | 'joined' | 'liked', index: number, emoji: string) => Promise<void>;
  handleToggleRepost: (tabType: 'own' | 'joined' | 'liked', index: number) => Promise<void>;
  handleSubmitComment: (tabType: 'own' | 'joined' | 'liked', index: number, text: string) => Promise<void>;

  // Delete/Report
  deleteTargetAlbumId: string | null;
  setDeleteTargetAlbumId: (id: string | null) => void;
  deleteBusy: boolean;
  handleConfirmDelete: () => Promise<void>;
  reportTargetAlbumId: string | null;
  setReportTargetAlbumId: (id: string | null) => void;
  reportBusy: boolean;
  handleConfirmReport: () => Promise<void>;
}

/**
 * プロフィールページのタブコンテンツを管理するカスタムフック
 * 内部で複数のサブフックを統合
 */
export function useProfileTabs(
  user: User | null | undefined,
  profile: ProfileData | null
): UseProfileTabsReturn {
  const profileUid = profile?.uid;

  // Tab state
  const [listTab, setListTab] = useState<TabType>('own');

  // Album rows data
  const albumRows = useAlbumRows({ user, profile });

  // Uploaded images
  const uploadedImages = useUploadedImages({
    profileUid,
    isTabActive: listTab === 'images',
  });

  // Album actions
  const albumActions = useAlbumActions({
    user,
    ownRows: albumRows.ownRows,
    joinedRows: albumRows.joinedRows,
    likedRows: albumRows.likedRows,
    setOwnRows: albumRows.setOwnRows,
    setJoinedRows: albumRows.setJoinedRows,
    setLikedRows: albumRows.setLikedRows,
  });

  // Album modals (delete/report)
  const albumModals = useAlbumModals({
    user,
    setOwnRows: albumRows.setOwnRows,
    setJoinedRows: albumRows.setJoinedRows,
  });

  // Reset uploaded images when profile changes
  useEffect(() => {
    uploadedImages.resetUploaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUid]);

  // Load liked albums when likes tab is opened
  useEffect(() => {
    if (listTab === 'likes') {
      albumRows.loadLikedAlbums();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listTab]);

  return {
    // Tab state
    listTab,
    setListTab,

    // Stats
    stats: albumRows.stats,
    likedCount: albumRows.likedCount,

    // Data
    ownRows: albumRows.ownRows,
    joinedRows: albumRows.joinedRows,
    likedRows: albumRows.likedRows,
    userComments: albumRows.userComments,

    // Uploaded images
    uploadedPhotos: uploadedImages.uploadedPhotos,
    uploadedLoading: uploadedImages.uploadedLoading,
    uploadedError: uploadedImages.uploadedError,
    uploadedErrorLink: uploadedImages.uploadedErrorLink,
    uploadedHasMore: uploadedImages.uploadedHasMore,
    sentinelRef: uploadedImages.sentinelRef,

    // Loading states
    loadingExtra: albumRows.loadingExtra,
    extraError: albumRows.extraError,
    likedLoading: albumRows.likedLoading,
    likedError: albumRows.likedError,

    // Album actions
    handleToggleLike: albumActions.handleToggleLike,
    handleToggleReaction: albumActions.handleToggleReaction,
    handleToggleRepost: albumActions.handleToggleRepost,
    handleSubmitComment: albumActions.handleSubmitComment,

    // Delete/Report
    deleteTargetAlbumId: albumModals.deleteTargetAlbumId,
    setDeleteTargetAlbumId: albumModals.setDeleteTargetAlbumId,
    deleteBusy: albumModals.deleteBusy,
    handleConfirmDelete: albumModals.handleConfirmDelete,
    reportTargetAlbumId: albumModals.reportTargetAlbumId,
    setReportTargetAlbumId: albumModals.setReportTargetAlbumId,
    reportBusy: albumModals.reportBusy,
    handleConfirmReport: albumModals.handleConfirmReport,
  };
}

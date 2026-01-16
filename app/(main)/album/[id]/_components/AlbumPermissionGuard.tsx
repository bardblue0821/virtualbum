"use client";
import React from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NotFoundPage } from '@/components/ui/NotFoundPage';
import { ERROR_MESSAGES } from '../_lib/constants/album.constants';

interface AlbumPermissionGuardProps<T> {
  children: (album: T) => React.ReactNode;
  albumId: string | undefined;
  loading: boolean;
  album: T | null;
  isBlocked: boolean;
  isOwner: boolean;
}

export function AlbumPermissionGuard<T>({
  children,
  albumId,
  loading,
  album,
  isBlocked,
  isOwner,
}: AlbumPermissionGuardProps<T>) {
  if (!albumId) {
    return <div className="text-sm fg-subtle">{ERROR_MESSAGES.NO_ALBUM_ID}</div>;
  }

  if (loading) {
    return <LoadingSpinner size="sm" />;
  }

  if (isBlocked && !isOwner) {
    return (
      <div className="text-sm fg-muted p-8 text-center">
        <p className="text-lg mb-2">⚠️</p>
        <p>{ERROR_MESSAGES.CANNOT_VIEW_ALBUM}</p>
      </div>
    );
  }

  if (!album) {
    return (
      <NotFoundPage
        title={ERROR_MESSAGES.ALBUM_NOT_FOUND}
        description={ERROR_MESSAGES.ALBUM_NOT_FOUND_DESC}
      />
    );
  }

  // すべてのチェックをパス
  return <>{children(album)}</>;
}

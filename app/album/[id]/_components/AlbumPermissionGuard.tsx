/**
 * アルバムのアクセス権限チェックコンポーネント
 */

import React from 'react';
import { ERROR_MESSAGES } from '../_lib/constants/album.constants';

interface AlbumPermissionGuardProps<T> {
  children: (album: T) => React.ReactNode;
  albumId: string | undefined;
  loading: boolean;
  album: T | null;
  error: string | null;
  isBlocked: boolean;
  isOwner: boolean;
}

export function AlbumPermissionGuard<T>({
  children,
  albumId,
  loading,
  album,
  error,
  isBlocked,
  isOwner,
}: AlbumPermissionGuardProps<T>) {
  // アルバムIDが指定されていない
  if (!albumId) {
    return <div className="text-sm fg-subtle">{ERROR_MESSAGES.NO_ALBUM_ID}</div>;
  }

  // 読み込み中
  if (loading) {
    return <div className="text-sm fg-subtle">読み込み中...</div>;
  }

  // ブロック判定: オーナーにブロックされている or オーナーをブロックしている場合は表示しない
  if (isBlocked && !isOwner) {
    return (
      <div className="text-sm fg-muted p-8 text-center">
        <p className="text-lg mb-2">⚠️</p>
        <p>{ERROR_MESSAGES.CANNOT_VIEW_ALBUM}</p>
      </div>
    );
  }

  // アルバムが存在しない
  if (!album) {
    return (
      <div className="text-sm fg-muted">
        {error ?? ERROR_MESSAGES.ALBUM_NOT_FOUND}
      </div>
    );
  }

  // すべてのチェックをパス - 関数として children を呼び出し、album を渡す
  return <>{children(album)}</>;
}

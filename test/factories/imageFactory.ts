/**
 * 画像ファクトリー
 * テスト用画像データを生成
 */

import type { AlbumImageDoc } from '@/lib/types/firestore';
import {
  randomId,
  sequentialId,
  dummyImageUrl,
  dummyThumbUrl,
  randomPastDate,
} from './helpers';

export interface CreateImageOptions {
  id?: string;
  albumId: string;
  uploaderId: string;
  url?: string;
  thumbUrl?: string;
  createdAt?: Date;
}

/**
 * 単一の画像を作成
 */
export function createImage(options: CreateImageOptions): AlbumImageDoc {
  const now = new Date();

  return {
    id: options.id || randomId(),
    albumId: options.albumId,
    uploaderId: options.uploaderId,
    url: options.url ?? dummyImageUrl(1920, 1080),
    thumbUrl: options.thumbUrl ?? dummyThumbUrl(),
    createdAt: options.createdAt || now,
  };
}

/**
 * アルバムの複数画像を作成
 */
export function createImages(
  albumId: string,
  uploaderId: string,
  count: number,
  baseOptions: Partial<CreateImageOptions> = {}
): AlbumImageDoc[] {
  return Array.from({ length: count }, (_, i) =>
    createImage({
      id: sequentialId('image', i),
      albumId,
      uploaderId,
      createdAt: randomPastDate(90),
      ...baseOptions,
    })
  );
}

/**
 * 複数アルバムの画像を作成
 * @param albums アルバムデータ (id, ownerId を持つオブジェクト)
 * @param imagesPerAlbum アルバムごとの画像数
 */
export function createImagesForAlbums(
  albums: Array<{ id: string; ownerId: string }>,
  imagesPerAlbum: number
): AlbumImageDoc[] {
  let counter = 0;
  return albums.flatMap((album) =>
    Array.from({ length: imagesPerAlbum }, () =>
      createImage({
        id: sequentialId('image', counter++),
        albumId: album.id,
        uploaderId: album.ownerId,
      })
    )
  );
}

/**
 * 複数ユーザーがアップロードした画像を作成
 * @param albumId アルバムID
 * @param uploaderIds アップローダーIDリスト
 * @param imagesPerUploader ユーザーごとの画像数
 */
export function createImagesFromMultipleUploaders(
  albumId: string,
  uploaderIds: string[],
  imagesPerUploader: number
): AlbumImageDoc[] {
  let counter = 0;
  return uploaderIds.flatMap((uploaderId) =>
    Array.from({ length: imagesPerUploader }, () =>
      createImage({
        id: sequentialId('image', counter++),
        albumId,
        uploaderId,
      })
    )
  );
}

/**
 * 日付範囲で画像を作成 (ソート/フィルタテスト用)
 */
export function createImagesWithDates(
  albumId: string,
  uploaderId: string,
  dates: Date[]
): AlbumImageDoc[] {
  return dates.map((date, i) =>
    createImage({
      id: sequentialId('dated_image', i),
      albumId,
      uploaderId,
      createdAt: date,
    })
  );
}

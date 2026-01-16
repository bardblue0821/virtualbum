/**
 * アルバムファクトリー
 * テスト用アルバムデータを生成
 */

import type { AlbumDoc, AlbumVisibility } from '@/lib/types/firestore';
import {
  randomId,
  sequentialId,
  randomAlbumTitle,
  randomPastDate,
  randomPick,
} from './helpers';

export interface CreateAlbumOptions {
  id?: string;
  ownerId: string;
  title?: string;
  placeUrl?: string;
  visibility?: AlbumVisibility;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 単一のアルバムを作成
 */
export function createAlbum(options: CreateAlbumOptions): AlbumDoc {
  const now = new Date();
  const id = options.id || randomId();

  return {
    id,
    ownerId: options.ownerId,
    title: options.title ?? randomAlbumTitle(),
    placeUrl: options.placeUrl,
    visibility: options.visibility ?? 'public',
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
  };
}

/**
 * 特定ユーザーの複数アルバムを作成
 */
export function createAlbums(
  ownerId: string,
  count: number,
  baseOptions: Partial<CreateAlbumOptions> = {}
): AlbumDoc[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = randomPastDate(180);
    return createAlbum({
      id: sequentialId('album', i),
      ownerId,
      visibility: randomPick(['public', 'friends'] as AlbumVisibility[]),
      createdAt,
      updatedAt: new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      ...baseOptions,
    });
  });
}

/**
 * 複数ユーザーのアルバムを作成
 * @param ownerIds ユーザーIDリスト
 * @param albumsPerUser ユーザーごとのアルバム数
 */
export function createAlbumsForUsers(
  ownerIds: string[],
  albumsPerUser: number
): AlbumDoc[] {
  let counter = 0;
  return ownerIds.flatMap((ownerId) =>
    Array.from({ length: albumsPerUser }, () => {
      const createdAt = randomPastDate(180);
      return createAlbum({
        id: sequentialId('album', counter++),
        ownerId,
        createdAt,
        updatedAt: createdAt,
      });
    })
  );
}

/**
 * 公開アルバムのみを作成
 */
export function createPublicAlbums(ownerId: string, count: number): AlbumDoc[] {
  return createAlbums(ownerId, count, { visibility: 'public' });
}

/**
 * フレンド限定アルバムのみを作成
 */
export function createFriendsOnlyAlbums(ownerId: string, count: number): AlbumDoc[] {
  return createAlbums(ownerId, count, { visibility: 'friends' });
}

/**
 * シードデータ用の固定アルバムセット
 */
export function createSeedAlbums(ownerIds: string[]): AlbumDoc[] {
  const albums: AlbumDoc[] = [];
  const titles = [
    'VRChat秋葉原オフ会',
    '渋谷散策2024',
    '誕生日パーティー',
    'クリスマスイベント',
    '新年会2025',
  ];

  ownerIds.forEach((ownerId, ownerIndex) => {
    titles.slice(0, 2 + ownerIndex % 3).forEach((title, titleIndex) => {
      albums.push(
        createAlbum({
          id: `seed_album_${ownerIndex}_${titleIndex}`,
          ownerId,
          title,
          visibility: titleIndex % 2 === 0 ? 'public' : 'friends',
        })
      );
    });
  });

  return albums;
}

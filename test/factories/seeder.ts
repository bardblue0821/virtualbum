/**
 * 大規模シミュレーション用データシーダー
 * 多数のユーザー、アルバム、ソーシャルデータを生成
 */

import type { Firestore } from 'firebase/firestore';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import {
  createBulkUsers,
  createAlbumsForUsers,
  createImagesForAlbums,
  createFriendNetwork,
  createWatchNetwork,
  createComments,
  createLikes,
  createReactions,
  randomPickMultiple,
} from './index';

export interface SeedConfig {
  userCount: number;
  albumsPerUser: number;
  imagesPerAlbum: number;
  friendConnectionRate: number;
  watchesPerUser: number;
  likesPerAlbum: number;
  commentsPerAlbum: number;
  reactionsPerAlbum: number;
}

export const DEFAULT_SEED_CONFIG: SeedConfig = {
  userCount: 100,
  albumsPerUser: 3,
  imagesPerAlbum: 5,
  friendConnectionRate: 0.1,
  watchesPerUser: 5,
  likesPerAlbum: 10,
  commentsPerAlbum: 3,
  reactionsPerAlbum: 5,
};

export const SMALL_SEED_CONFIG: SeedConfig = {
  userCount: 10,
  albumsPerUser: 2,
  imagesPerAlbum: 3,
  friendConnectionRate: 0.3,
  watchesPerUser: 3,
  likesPerAlbum: 3,
  commentsPerAlbum: 2,
  reactionsPerAlbum: 2,
};

export const LARGE_SEED_CONFIG: SeedConfig = {
  userCount: 500,
  albumsPerUser: 5,
  imagesPerAlbum: 10,
  friendConnectionRate: 0.05,
  watchesPerUser: 10,
  likesPerAlbum: 20,
  commentsPerAlbum: 5,
  reactionsPerAlbum: 10,
};

/**
 * シードデータの生成結果
 */
export interface SeedResult {
  userIds: string[];
  albumIds: string[];
  imageIds: string[];
  stats: {
    users: number;
    albums: number;
    images: number;
    friends: number;
    watches: number;
    likes: number;
    comments: number;
    reactions: number;
  };
}

/**
 * シードデータを生成（メモリ上のみ）
 */
export function generateSeedData(config: SeedConfig = DEFAULT_SEED_CONFIG): SeedResult {
  // ユーザー生成
  const users = createBulkUsers(config.userCount);
  const userIds = users.map((u) => u.uid);

  // アルバム生成
  const albums = createAlbumsForUsers(userIds, config.albumsPerUser);
  const albumIds = albums.map((a) => a.id);

  // 画像生成
  const images = createImagesForAlbums(
    albums.map((a) => ({ id: a.id, ownerId: a.ownerId })),
    config.imagesPerAlbum
  );
  const imageIds = images.map((i) => i.id);

  // ソーシャルデータ生成
  const friends = createFriendNetwork(userIds, config.friendConnectionRate);
  const watches = createWatchNetwork(userIds, config.watchesPerUser);

  // アルバムごとのいいね・コメント・リアクション
  let totalLikes = 0;
  let totalComments = 0;
  let totalReactions = 0;

  albums.forEach((album) => {
    const likers = randomPickMultiple(
      userIds.filter((id) => id !== album.ownerId),
      config.likesPerAlbum
    );
    totalLikes += likers.length;

    const commenters = randomPickMultiple(
      userIds.filter((id) => id !== album.ownerId),
      config.commentsPerAlbum
    );
    totalComments += commenters.length;

    const reactors = randomPickMultiple(
      userIds.filter((id) => id !== album.ownerId),
      config.reactionsPerAlbum
    );
    totalReactions += reactors.length;
  });

  return {
    userIds,
    albumIds,
    imageIds,
    stats: {
      users: users.length,
      albums: albums.length,
      images: images.length,
      friends: friends.length,
      watches: watches.length,
      likes: totalLikes,
      comments: totalComments,
      reactions: totalReactions,
    },
  };
}

/**
 * Firestore にシードデータを書き込む
 * @param db Firestore インスタンス
 * @param config シード設定
 * @param batchSize バッチサイズ（デフォルト500、Firestore制限）
 */
export async function seedFirestore(
  db: Firestore,
  config: SeedConfig = DEFAULT_SEED_CONFIG,
  batchSize: number = 500
): Promise<SeedResult> {
  console.log(`🌱 Starting seed with config:`, config);

  // ユーザー生成
  const users = createBulkUsers(config.userCount);
  const userIds = users.map((u) => u.uid);
  console.log(`  Created ${users.length} users`);

  // バッチ書き込み: ユーザー
  await batchWrite(db, 'users', users.map((u) => ({ id: u.uid, data: u })), batchSize);

  // アルバム生成
  const albums = createAlbumsForUsers(userIds, config.albumsPerUser);
  console.log(`  Created ${albums.length} albums`);
  await batchWrite(db, 'albums', albums.map((a) => ({ id: a.id, data: a })), batchSize);

  // 画像生成
  const images = createImagesForAlbums(
    albums.map((a) => ({ id: a.id, ownerId: a.ownerId })),
    config.imagesPerAlbum
  );
  console.log(`  Created ${images.length} images`);
  await batchWrite(db, 'albumImages', images.map((i) => ({ id: i.id, data: i })), batchSize);

  // フレンド
  const friends = createFriendNetwork(userIds, config.friendConnectionRate);
  console.log(`  Created ${friends.length} friend relationships`);
  await batchWrite(db, 'friends', friends.map((f) => ({ id: f.id, data: f })), batchSize);

  // ウォッチ
  const watches = createWatchNetwork(userIds, config.watchesPerUser);
  console.log(`  Created ${watches.length} watches`);
  await batchWrite(db, 'watches', watches.map((w) => ({ id: w.id, data: w })), batchSize);

  // いいね・コメント・リアクション
  let allLikes: Array<{ id: string; data: unknown }> = [];
  let allComments: Array<{ id: string; data: unknown }> = [];
  let allReactions: Array<{ id: string; data: unknown }> = [];

  albums.forEach((album) => {
    const likers = randomPickMultiple(
      userIds.filter((id) => id !== album.ownerId),
      config.likesPerAlbum
    );
    const likes = createLikes(album.id, likers);
    allLikes.push(...likes.map((l) => ({ id: l.id, data: l })));

    const commenters = randomPickMultiple(
      userIds.filter((id) => id !== album.ownerId),
      config.commentsPerAlbum
    );
    const comments = createComments(album.id, commenters);
    allComments.push(...comments.map((c) => ({ id: c.id, data: c })));

    const reactors = randomPickMultiple(
      userIds.filter((id) => id !== album.ownerId),
      config.reactionsPerAlbum
    );
    const reactions = createReactions(album.id, reactors);
    allReactions.push(...reactions.map((r) => ({ id: r.id, data: r })));
  });

  console.log(`  Created ${allLikes.length} likes`);
  await batchWrite(db, 'likes', allLikes, batchSize);

  console.log(`  Created ${allComments.length} comments`);
  await batchWrite(db, 'comments', allComments, batchSize);

  console.log(`  Created ${allReactions.length} reactions`);
  await batchWrite(db, 'reactions', allReactions, batchSize);

  console.log(`✅ Seed completed!`);

  return {
    userIds,
    albumIds: albums.map((a) => a.id),
    imageIds: images.map((i) => i.id),
    stats: {
      users: users.length,
      albums: albums.length,
      images: images.length,
      friends: friends.length,
      watches: watches.length,
      likes: allLikes.length,
      comments: allComments.length,
      reactions: allReactions.length,
    },
  };
}

/**
 * バッチ書き込みヘルパー
 */
async function batchWrite<T>(
  db: Firestore,
  collectionPath: string,
  documents: Array<{ id: string; data: T }>,
  batchSize: number
): Promise<void> {
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = documents.slice(i, i + batchSize);

    chunk.forEach(({ id, data }) => {
      const ref = doc(db, collectionPath, id);
      batch.set(ref, data as Record<string, unknown>);
    });

    await batch.commit();
  }
}

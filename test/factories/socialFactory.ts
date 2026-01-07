/**
 * ソーシャルファクトリー
 * コメント、いいね、リポスト、リアクション、フレンド、ウォッチのテストデータを生成
 */

import type {
  CommentDoc,
  LikeDoc,
  RepostDoc,
  ReactionDoc,
  FriendDoc,
  WatchDoc,
  FriendStatus,
} from '@/src/types/firestore';
import {
  randomId,
  sequentialId,
  randomCommentBody,
  randomEmoji,
  randomPastDate,
  randomPickMultiple,
} from './helpers';

// ========== コメント ==========

export interface CreateCommentOptions {
  id?: string;
  albumId: string;
  userId: string;
  body?: string;
  createdAt?: Date;
}

export function createComment(options: CreateCommentOptions): CommentDoc {
  return {
    id: options.id || randomId(),
    albumId: options.albumId,
    userId: options.userId,
    body: options.body ?? randomCommentBody(),
    createdAt: options.createdAt || new Date(),
  };
}

export function createComments(
  albumId: string,
  userIds: string[],
  commentsPerUser: number = 1
): CommentDoc[] {
  let counter = 0;
  return userIds.flatMap((userId) =>
    Array.from({ length: commentsPerUser }, () =>
      createComment({
        id: sequentialId('comment', counter++),
        albumId,
        userId,
        createdAt: randomPastDate(30),
      })
    )
  );
}

// ========== いいね ==========

export interface CreateLikeOptions {
  id?: string;
  albumId: string;
  userId: string;
  createdAt?: Date;
}

export function createLike(options: CreateLikeOptions): LikeDoc {
  return {
    id: options.id || randomId(),
    albumId: options.albumId,
    userId: options.userId,
    createdAt: options.createdAt || new Date(),
  };
}

export function createLikes(albumId: string, userIds: string[]): LikeDoc[] {
  return userIds.map((userId, i) =>
    createLike({
      id: sequentialId('like', i),
      albumId,
      userId,
      createdAt: randomPastDate(30),
    })
  );
}

// ========== リポスト ==========

export interface CreateRepostOptions {
  id?: string;
  albumId: string;
  userId: string;
  createdAt?: Date;
}

export function createRepost(options: CreateRepostOptions): RepostDoc {
  return {
    id: options.id || randomId(),
    albumId: options.albumId,
    userId: options.userId,
    createdAt: options.createdAt || new Date(),
  };
}

export function createReposts(albumId: string, userIds: string[]): RepostDoc[] {
  return userIds.map((userId, i) =>
    createRepost({
      id: sequentialId('repost', i),
      albumId,
      userId,
      createdAt: randomPastDate(30),
    })
  );
}

// ========== リアクション ==========

export interface CreateReactionOptions {
  id?: string;
  albumId: string;
  userId: string;
  emoji?: string;
  createdAt?: Date;
}

export function createReaction(options: CreateReactionOptions): ReactionDoc {
  return {
    id: options.id || randomId(),
    albumId: options.albumId,
    userId: options.userId,
    emoji: options.emoji ?? randomEmoji(),
    createdAt: options.createdAt || new Date(),
  };
}

export function createReactions(
  albumId: string,
  userIds: string[],
  emojiList: string[] = ['❤️', '👍', '😊']
): ReactionDoc[] {
  let counter = 0;
  return userIds.map((userId) =>
    createReaction({
      id: sequentialId('reaction', counter++),
      albumId,
      userId,
      emoji: emojiList[counter % emojiList.length],
    })
  );
}

// ========== フレンド ==========

export interface CreateFriendOptions {
  id?: string;
  userId: string;
  targetId: string;
  status?: FriendStatus;
  createdAt?: Date;
}

export function createFriend(options: CreateFriendOptions): FriendDoc {
  return {
    id: options.id || randomId(),
    userId: options.userId,
    targetId: options.targetId,
    status: options.status ?? 'accepted',
    createdAt: options.createdAt || new Date(),
  };
}

/**
 * 相互フレンドを作成 (両方向のドキュメント)
 */
export function createMutualFriends(userA: string, userB: string): FriendDoc[] {
  const id1 = `friend_${userA}_${userB}`;
  const id2 = `friend_${userB}_${userA}`;
  const now = new Date();
  return [
    createFriend({ id: id1, userId: userA, targetId: userB, status: 'accepted', createdAt: now }),
    createFriend({ id: id2, userId: userB, targetId: userA, status: 'accepted', createdAt: now }),
  ];
}

/**
 * フレンド申請 (pending) を作成
 */
export function createFriendRequest(fromUserId: string, toUserId: string): FriendDoc {
  return createFriend({
    id: `friend_req_${fromUserId}_${toUserId}`,
    userId: fromUserId,
    targetId: toUserId,
    status: 'pending',
  });
}

/**
 * 複数ユーザー間のフレンドネットワークを作成
 * @param userIds ユーザーIDリスト
 * @param connectionRate 各ユーザーが他のユーザーとつながる確率 (0.0-1.0)
 */
export function createFriendNetwork(
  userIds: string[],
  connectionRate: number = 0.3
): FriendDoc[] {
  const friends: FriendDoc[] = [];

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      if (Math.random() < connectionRate) {
        friends.push(...createMutualFriends(userIds[i], userIds[j]));
      }
    }
  }

  return friends;
}

// ========== ウォッチ ==========

export interface CreateWatchOptions {
  id?: string;
  userId: string;
  ownerId: string;
  createdAt?: Date;
}

export function createWatch(options: CreateWatchOptions): WatchDoc {
  return {
    id: options.id || randomId(),
    userId: options.userId,
    ownerId: options.ownerId,
    createdAt: options.createdAt || new Date(),
  };
}

/**
 * ユーザーが複数の対象をウォッチ
 */
export function createWatches(userId: string, ownerIds: string[]): WatchDoc[] {
  return ownerIds.map((ownerId, i) =>
    createWatch({
      id: sequentialId('watch', i),
      userId,
      ownerId,
    })
  );
}

/**
 * ランダムなウォッチネットワークを作成
 * @param userIds ユーザーIDリスト
 * @param watchesPerUser 各ユーザーがウォッチする対象数
 */
export function createWatchNetwork(
  userIds: string[],
  watchesPerUser: number = 3
): WatchDoc[] {
  let counter = 0;
  return userIds.flatMap((userId) => {
    const targets = randomPickMultiple(
      userIds.filter((id) => id !== userId),
      watchesPerUser
    );
    return targets.map((ownerId) =>
      createWatch({
        id: sequentialId('watch', counter++),
        userId,
        ownerId,
      })
    );
  });
}

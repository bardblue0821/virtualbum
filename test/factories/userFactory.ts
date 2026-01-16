/**
 * ユーザーファクトリー
 * テスト用ユーザーデータを生成
 */

import type { UserDoc } from '@/lib/types/firestore';
import {
  randomId,
  sequentialId,
  randomJapaneseName,
  randomHandle,
  randomPastDate,
  dummyImageUrl,
} from './helpers';

export interface CreateUserOptions {
  uid?: string;
  displayName?: string;
  handle?: string;
  iconURL?: string;
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 単一のユーザーを作成
 */
export function createUser(options: CreateUserOptions = {}): UserDoc {
  const now = new Date();
  const uid = options.uid || randomId();

  return {
    uid,
    displayName: options.displayName || randomJapaneseName(),
    handle: options.handle || randomHandle(),
    iconURL: options.iconURL ?? dummyImageUrl(200, 200),
    bio: options.bio ?? `テストユーザー ${uid.slice(0, 6)} の自己紹介です`,
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
  };
}

/**
 * 複数のユーザーを一括作成
 */
export function createUsers(count: number, baseOptions: CreateUserOptions = {}): UserDoc[] {
  return Array.from({ length: count }, (_, i) =>
    createUser({
      ...baseOptions,
      uid: baseOptions.uid ? `${baseOptions.uid}_${i}` : sequentialId('user', i),
      handle: baseOptions.handle ? `${baseOptions.handle}_${i}` : undefined,
    })
  );
}

/**
 * 特定の名前パターンでユーザーを作成
 */
export function createNamedUsers(names: string[]): UserDoc[] {
  return names.map((name, i) =>
    createUser({
      uid: sequentialId('user', i),
      displayName: name,
      handle: name.toLowerCase().replace(/\s+/g, '_'),
    })
  );
}

/**
 * 管理者ユーザーを作成
 */
export function createAdminUser(options: CreateUserOptions = {}): UserDoc {
  return {
    ...createUser(options),
    isAdmin: true,
  };
}

/**
 * シードデータ用の固定ユーザーセット
 */
export function createSeedUsers(): UserDoc[] {
  return [
    createUser({ uid: 'alice', displayName: 'Alice', handle: 'alice' }),
    createUser({ uid: 'bob', displayName: 'Bob', handle: 'bob' }),
    createUser({ uid: 'charlie', displayName: 'Charlie', handle: 'charlie' }),
    createUser({ uid: 'diana', displayName: 'Diana', handle: 'diana' }),
    createUser({ uid: 'eve', displayName: 'Eve', handle: 'eve' }),
  ];
}

/**
 * 大規模テスト用ユーザー生成
 * @param count 作成するユーザー数
 * @param createdAfter この日時以降のランダムな作成日時を設定
 */
export function createBulkUsers(
  count: number,
  createdAfter: Date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
): UserDoc[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = randomPastDate(365);
    // createdAfter より新しい日付を保証
    if (createdAt < createdAfter) {
      createdAt.setTime(createdAfter.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    }
    return createUser({
      uid: sequentialId('bulk_user', i),
      createdAt,
      updatedAt: new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
    });
  });
}

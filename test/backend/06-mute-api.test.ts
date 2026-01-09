/**
 * ミュート機能 バックエンドテスト
 */

import {
  testUsers,
  setupFirestoreMock,
  resetFirestoreMocks,
  mockGetDoc,
  mockSetDoc,
  mockDeleteDoc,
  mockGetDocs,
  createMockDocSnapshot,
  createMockQuerySnapshot,
} from '../__mocks__';

// Firebase モジュールをモック
jest.mock('firebase/firestore', () => setupFirestoreMock());
jest.mock('@/lib/firebase', () => ({
  db: {},
}));

// muteRepoをテスト用にインポート
// モックが先に設定されている必要がある
import * as muteRepo from '@/lib/repos/muteRepo';

describe('ミュート機能テスト', () => {
  beforeEach(() => {
    resetFirestoreMocks();
  });

  describe('muteUser', () => {
    test('ユーザーをミュートできる', async () => {
      // ミュートが存在しない状態
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockSetDoc.mockResolvedValue(undefined);

      await muteRepo.muteUser(testUsers.userA.uid, testUsers.userB.uid);

      expect(mockSetDoc).toHaveBeenCalled();
    });

    test('自分自身をミュートできない', async () => {
      await expect(
        muteRepo.muteUser(testUsers.userA.uid, testUsers.userA.uid)
      ).rejects.toThrow();
    });

    test('既にミュート済みの場合はエラー', async () => {
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userB.uid, mutedAt: new Date() }, true)
      );

      await expect(
        muteRepo.muteUser(testUsers.userA.uid, testUsers.userB.uid)
      ).rejects.toThrow();
    });
  });

  describe('unmuteUser', () => {
    test('ミュートを解除できる', async () => {
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userB.uid, mutedAt: new Date() }, true)
      );
      mockDeleteDoc.mockResolvedValue(undefined);

      await muteRepo.unmuteUser(testUsers.userA.uid, testUsers.userB.uid);

      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    test('ミュートしていない場合はエラー', async () => {
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));

      await expect(
        muteRepo.unmuteUser(testUsers.userA.uid, testUsers.userB.uid)
      ).rejects.toThrow();
    });

    test('自分自身のミュート解除はエラー', async () => {
      await expect(
        muteRepo.unmuteUser(testUsers.userA.uid, testUsers.userA.uid)
      ).rejects.toThrow();
    });
  });

  describe('toggleMute', () => {
    test('ミュートしていない場合はミュートする', async () => {
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockSetDoc.mockResolvedValue(undefined);

      const result = await muteRepo.toggleMute(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(true);
      expect(mockSetDoc).toHaveBeenCalled();
    });

    test('ミュート中の場合は解除する', async () => {
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userB.uid, mutedAt: new Date() }, true)
      );
      mockDeleteDoc.mockResolvedValue(undefined);

      const result = await muteRepo.toggleMute(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(false);
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    test('自分自身のトグルはエラー', async () => {
      await expect(
        muteRepo.toggleMute(testUsers.userA.uid, testUsers.userA.uid)
      ).rejects.toThrow();
    });
  });

  describe('isMuting', () => {
    test('ミュート中の場合はtrueを返す', async () => {
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userB.uid, mutedAt: new Date() }, true)
      );

      const result = await muteRepo.isMuting(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(true);
    });

    test('ミュートしていない場合はfalseを返す', async () => {
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));

      const result = await muteRepo.isMuting(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(false);
    });

    test('自分自身はfalseを返す', async () => {
      const result = await muteRepo.isMuting(testUsers.userA.uid, testUsers.userA.uid);

      expect(result).toBe(false);
    });
  });

  describe('getMutedUserIds', () => {
    test('ミュート中のユーザーIDリストを取得できる', async () => {
      mockGetDocs.mockResolvedValueOnce(
        createMockQuerySnapshot([
          { id: 'user1', mutedAt: new Date() },
          { id: 'user2', mutedAt: new Date() },
        ])
      );

      const result = await muteRepo.getMutedUserIds(testUsers.userA.uid);

      expect(result).toEqual(['user1', 'user2']);
    });

    test('ミュートしているユーザーがいない場合は空配列を返す', async () => {
      mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));

      const result = await muteRepo.getMutedUserIds(testUsers.userA.uid);

      expect(result).toEqual([]);
    });
  });

  describe('filterOutMuted (タイムライン用)', () => {
    test('ミュート中のユーザーのアルバムをフィルタできる', async () => {
      const albums = [
        { id: 'album1', ownerId: testUsers.userA.uid },
        { id: 'album2', ownerId: testUsers.userB.uid },
        { id: 'album3', ownerId: 'user3' },
      ];
      const mutedIds = [testUsers.userB.uid];

      const result = muteRepo.filterOutMuted(albums, mutedIds, 'ownerId');

      expect(result).toHaveLength(2);
      expect(result.map(a => a.id)).toEqual(['album1', 'album3']);
    });

    test('ミュートリストが空の場合はフィルタしない', async () => {
      const albums = [
        { id: 'album1', ownerId: testUsers.userA.uid },
        { id: 'album2', ownerId: testUsers.userB.uid },
      ];

      const result = muteRepo.filterOutMuted(albums, [], 'ownerId');

      expect(result).toHaveLength(2);
    });
  });

  describe('filterOutMutedComments (コメント用)', () => {
    test('ミュート中のユーザーのコメントをフィルタできる', async () => {
      const comments = [
        { id: 'c1', userId: testUsers.userA.uid, body: 'Hello' },
        { id: 'c2', userId: testUsers.userB.uid, body: 'World' },
        { id: 'c3', userId: 'user3', body: 'Test' },
      ];
      const mutedIds = [testUsers.userB.uid];

      const result = muteRepo.filterOutMuted(comments, mutedIds, 'userId');

      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toEqual(['c1', 'c3']);
    });
  });
});

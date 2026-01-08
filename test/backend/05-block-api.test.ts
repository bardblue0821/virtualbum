/**
 * ブロック機能 バックエンドテスト
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

// blockRepoをテスト用にインポート
// モックが先に設定されている必要がある
import * as blockRepo from '@/lib/repos/blockRepo';

describe('ブロック機能テスト', () => {
  beforeEach(() => {
    resetFirestoreMocks();
  });

  describe('blockUser', () => {
    test('ユーザーをブロックできる', async () => {
      // ブロックが存在しない状態
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      // フレンド関係チェック
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      // ウォッチ関係チェック
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockSetDoc.mockResolvedValue(undefined);

      await blockRepo.blockUser(testUsers.userA.uid, testUsers.userB.uid);

      expect(mockSetDoc).toHaveBeenCalled();
    });

    test('自分自身をブロックできない', async () => {
      await expect(
        blockRepo.blockUser(testUsers.userA.uid, testUsers.userA.uid)
      ).rejects.toThrow();
    });

    test('既にブロック済みの場合はエラー', async () => {
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userB.uid, blockedAt: new Date() }, true)
      );

      await expect(
        blockRepo.blockUser(testUsers.userA.uid, testUsers.userB.uid)
      ).rejects.toThrow();
    });
  });

  describe('unblockUser', () => {
    test('ブロックを解除できる', async () => {
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userB.uid, blockedAt: new Date() }, true)
      );
      mockDeleteDoc.mockResolvedValue(undefined);

      await blockRepo.unblockUser(testUsers.userA.uid, testUsers.userB.uid);

      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    test('ブロックしていない場合はエラー', async () => {
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));

      await expect(
        blockRepo.unblockUser(testUsers.userA.uid, testUsers.userB.uid)
      ).rejects.toThrow();
    });

    test('自分自身のブロック解除はエラー', async () => {
      await expect(
        blockRepo.unblockUser(testUsers.userA.uid, testUsers.userA.uid)
      ).rejects.toThrow();
    });
  });

  describe('toggleBlock', () => {
    test('ブロックしていない場合はブロックする', async () => {
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      // フレンド関係チェック
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      // ウォッチ関係チェック
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockSetDoc.mockResolvedValue(undefined);

      const result = await blockRepo.toggleBlock(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(true);
      expect(mockSetDoc).toHaveBeenCalled();
    });

    test('ブロック中の場合は解除する', async () => {
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userB.uid, blockedAt: new Date() }, true)
      );
      mockDeleteDoc.mockResolvedValue(undefined);

      const result = await blockRepo.toggleBlock(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(false);
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('isBlocking', () => {
    test('ブロック中の場合はtrueを返す', async () => {
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userB.uid, blockedAt: new Date() }, true)
      );

      const result = await blockRepo.isBlocking(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(true);
    });

    test('ブロックしていない場合はfalseを返す', async () => {
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));

      const result = await blockRepo.isBlocking(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(false);
    });

    test('自分自身の場合はfalseを返す', async () => {
      const result = await blockRepo.isBlocking(testUsers.userA.uid, testUsers.userA.uid);

      expect(result).toBe(false);
    });
  });

  describe('isEitherBlocking', () => {
    test('AがBをブロックしている場合はtrueを返す', async () => {
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userB.uid, blockedAt: new Date() }, true)
      );
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));

      const result = await blockRepo.isEitherBlocking(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(true);
    });

    test('BがAをブロックしている場合はtrueを返す', async () => {
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: testUsers.userA.uid, blockedAt: new Date() }, true)
      );

      const result = await blockRepo.isEitherBlocking(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(true);
    });

    test('どちらもブロックしていない場合はfalseを返す', async () => {
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));

      const result = await blockRepo.isEitherBlocking(testUsers.userA.uid, testUsers.userB.uid);

      expect(result).toBe(false);
    });
  });

  describe('getBlockedUserIds', () => {
    test('ブロック中のユーザーIDリストを取得できる', async () => {
      mockGetDocs.mockResolvedValueOnce(
        createMockQuerySnapshot([
          { id: 'user-1' },
          { id: 'user-2' },
          { id: 'user-3' },
        ])
      );

      const result = await blockRepo.getBlockedUserIds(testUsers.userA.uid);

      expect(result).toHaveLength(3);
    });

    test('ブロック中のユーザーがいない場合は空配列を返す', async () => {
      mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));

      const result = await blockRepo.getBlockedUserIds(testUsers.userA.uid);

      expect(result).toHaveLength(0);
    });
  });

  describe('filterOutBlocked', () => {
    test('ブロック中のユーザーを除外できる', async () => {
      mockGetDocs.mockResolvedValueOnce(
        createMockQuerySnapshot([{ id: 'user-2' }])
      );

      const result = await blockRepo.filterOutBlocked(testUsers.userA.uid, [
        'user-1',
        'user-2',
        'user-3',
      ]);

      expect(result).toEqual(['user-1', 'user-3']);
    });

    test('空配列の場合は空配列を返す', async () => {
      const result = await blockRepo.filterOutBlocked(testUsers.userA.uid, []);

      expect(result).toEqual([]);
    });
  });

  describe('副作用テスト', () => {
    test('ブロック時にフレンド関係が解除される', async () => {
      // ブロックが存在しない
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      // フレンド関係が存在する（順方向）
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: 'friend_id', status: 'accepted' }, true)
      );
      // フレンド関係（逆方向）は存在しない
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      // ウォッチ関係は存在しない
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));

      mockSetDoc.mockResolvedValue(undefined);
      mockDeleteDoc.mockResolvedValue(undefined);

      await blockRepo.blockUser(testUsers.userA.uid, testUsers.userB.uid);

      // setDoc（ブロック追加）と deleteDoc（フレンド解除）が呼ばれる
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });

    test('ブロック時にウォッチ関係が解除される', async () => {
      // ブロックが存在しない
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      // フレンド関係は存在しない
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot(null, false));
      // ウォッチ関係が存在する（双方向）
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: 'watch_id', userId: testUsers.userA.uid }, true)
      );
      mockGetDoc.mockResolvedValueOnce(
        createMockDocSnapshot({ id: 'watch_id_2', userId: testUsers.userB.uid }, true)
      );

      mockSetDoc.mockResolvedValue(undefined);
      mockDeleteDoc.mockResolvedValue(undefined);

      await blockRepo.blockUser(testUsers.userA.uid, testUsers.userB.uid);

      // setDoc（ブロック追加）と deleteDoc（ウォッチ解除×2）が呼ばれる
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    });
  });
});

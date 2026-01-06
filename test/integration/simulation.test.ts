/**
 * 大規模シミュレーションテスト
 * 多数のユーザー・アルバムでのパフォーマンスと動作確認
 */

import {
  setupTestEnvironment,
  clearFirestoreData,
  cleanupTestEnvironment,
  getAuthenticatedFirestore,
} from '../helpers/emulator';
import {
  seedFirestore,
  generateSeedData,
  SMALL_SEED_CONFIG,
  DEFAULT_SEED_CONFIG,
} from '../factories/seeder';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

// タイムアウト延長 (大規模データ生成のため)
jest.setTimeout(120000);

describe('大規模シミュレーションテスト', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    await clearFirestoreData();
  });

  describe('データ生成テスト', () => {
    test('メモリ上でシードデータを生成できる', () => {
      const result = generateSeedData(SMALL_SEED_CONFIG);

      expect(result.userIds.length).toBe(SMALL_SEED_CONFIG.userCount);
      expect(result.albumIds.length).toBe(
        SMALL_SEED_CONFIG.userCount * SMALL_SEED_CONFIG.albumsPerUser
      );
      expect(result.imageIds.length).toBe(
        SMALL_SEED_CONFIG.userCount *
          SMALL_SEED_CONFIG.albumsPerUser *
          SMALL_SEED_CONFIG.imagesPerAlbum
      );

      console.log('📊 Generated seed stats:', result.stats);
    });

    test('デフォルト設定でデータ概算を確認', () => {
      const result = generateSeedData(DEFAULT_SEED_CONFIG);

      // 100ユーザー x 3アルバム = 300アルバム
      expect(result.stats.albums).toBe(300);
      // 300アルバム x 5画像 = 1500画像
      expect(result.stats.images).toBe(1500);

      console.log('📊 Default config stats:', result.stats);
    });
  });

  describe('Firestore シードテスト', () => {
    test('小規模データを Firestore にシードできる', async () => {
      const db = getAuthenticatedFirestore('admin');

      const result = await seedFirestore(db, SMALL_SEED_CONFIG);

      // ユーザー確認
      const usersSnapshot = await getDocs(collection(db, 'users'));
      expect(usersSnapshot.size).toBe(SMALL_SEED_CONFIG.userCount);

      // アルバム確認
      const albumsSnapshot = await getDocs(collection(db, 'albums'));
      expect(albumsSnapshot.size).toBe(result.stats.albums);

      // 画像確認
      const imagesSnapshot = await getDocs(collection(db, 'albumImages'));
      expect(imagesSnapshot.size).toBe(result.stats.images);

      console.log('✅ Seeded data verified:', result.stats);
    });
  });

  describe('クエリパフォーマンステスト', () => {
    test('タイムライン風クエリの実行時間を計測', async () => {
      const db = getAuthenticatedFirestore('admin');
      await seedFirestore(db, SMALL_SEED_CONFIG);

      const userId = 'bulk_user_0000';

      // 1. フレンド取得
      const friendsStart = performance.now();
      const friendsQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId),
        where('status', '==', 'accepted')
      );
      const friendsSnapshot = await getDocs(friendsQuery);
      const friendsTime = performance.now() - friendsStart;

      // 2. ウォッチ取得
      const watchesStart = performance.now();
      const watchesQuery = query(
        collection(db, 'watches'),
        where('userId', '==', userId)
      );
      const watchesSnapshot = await getDocs(watchesQuery);
      const watchesTime = performance.now() - watchesStart;

      // 3. タイムラインアルバム取得
      const albumsStart = performance.now();
      const albumsQuery = query(
        collection(db, 'albums'),
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const albumsSnapshot = await getDocs(albumsQuery);
      const albumsTime = performance.now() - albumsStart;

      console.log('⏱️ Query performance:');
      console.log(`  Friends query: ${friendsTime.toFixed(2)}ms (${friendsSnapshot.size} docs)`);
      console.log(`  Watches query: ${watchesTime.toFixed(2)}ms (${watchesSnapshot.size} docs)`);
      console.log(`  Albums query: ${albumsTime.toFixed(2)}ms (${albumsSnapshot.size} docs)`);

      // パフォーマンス基準（エミュレータなので緩め）
      expect(albumsTime).toBeLessThan(5000);
    });

    test('ユーザー検索クエリの実行時間を計測', async () => {
      const db = getAuthenticatedFirestore('admin');
      await seedFirestore(db, SMALL_SEED_CONFIG);

      const start = performance.now();
      const q = query(
        collection(db, 'users'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const elapsed = performance.now() - start;

      console.log(`⏱️ User search: ${elapsed.toFixed(2)}ms (${snapshot.size} docs)`);

      expect(elapsed).toBeLessThan(3000);
    });
  });

  describe('データ整合性テスト', () => {
    test('フレンド関係が双方向で存在する', async () => {
      const db = getAuthenticatedFirestore('admin');
      await seedFirestore(db, SMALL_SEED_CONFIG);

      const friendsSnapshot = await getDocs(collection(db, 'friends'));
      const friends = friendsSnapshot.docs.map((doc) => doc.data());

      // accepted のフレンドのみチェック
      const acceptedFriends = friends.filter((f) => f.status === 'accepted');

      // 双方向存在チェック (サンプリング)
      const sample = acceptedFriends.slice(0, 10);
      for (const friend of sample) {
        const reverse = acceptedFriends.find(
          (f) => f.userId === friend.targetId && f.targetId === friend.userId
        );
        expect(reverse).toBeDefined();
      }
    });

    test('アルバムのオーナーが全てユーザーとして存在する', async () => {
      const db = getAuthenticatedFirestore('admin');
      await seedFirestore(db, SMALL_SEED_CONFIG);

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userIds = new Set(usersSnapshot.docs.map((doc) => doc.id));

      const albumsSnapshot = await getDocs(collection(db, 'albums'));
      const albums = albumsSnapshot.docs.map((doc) => doc.data());

      for (const album of albums) {
        expect(userIds.has(album.ownerId)).toBe(true);
      }
    });
  });
});

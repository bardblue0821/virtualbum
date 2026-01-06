/**
 * リポジトリ層 インテグレーションテスト
 * Firebase Emulator を使用した実際のデータ操作テスト
 */

import {
  setupTestEnvironment,
  clearFirestoreData,
  cleanupTestEnvironment,
  getAuthenticatedFirestore,
  seedDocuments,
  getDocument,
} from '../helpers/emulator';
import {
  createUser,
  createSeedUsers,
  createAlbum,
  createSeedAlbums,
} from '../factories';
import { doc, setDoc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import type { UserDoc, AlbumDoc } from '../../types/models';

describe('リポジトリ層 インテグレーションテスト', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    await clearFirestoreData();
  });

  describe('ユーザーリポジトリ', () => {
    test('ユーザーを作成して取得できる', async () => {
      const db = getAuthenticatedFirestore('alice');
      const userData = createUser({ uid: 'alice', displayName: 'Alice', handle: 'alice' });

      // 作成
      await setDoc(doc(db, 'users', userData.uid), userData);

      // 取得
      const snapshot = await getDoc(doc(db, 'users', 'alice'));
      expect(snapshot.exists()).toBe(true);

      const retrieved = snapshot.data() as UserDoc;
      expect(retrieved.displayName).toBe('Alice');
      expect(retrieved.handle).toBe('alice');
    });

    test('複数ユーザーをシードして検索できる', async () => {
      const db = getAuthenticatedFirestore('admin');
      const users = createSeedUsers();

      // バッチシード
      await seedDocuments(db, 'users', users.map((u) => ({ id: u.uid, data: u })));

      // 全件取得
      const snapshot = await getDocs(collection(db, 'users'));
      expect(snapshot.size).toBe(5);

      // 特定ユーザー取得
      const alice = await getDocument<UserDoc>(db, 'users', 'alice');
      expect(alice?.displayName).toBe('Alice');
    });

    test('ハンドルでユーザーを検索できる', async () => {
      const db = getAuthenticatedFirestore('admin');
      const users = createSeedUsers();
      await seedDocuments(db, 'users', users.map((u) => ({ id: u.uid, data: u })));

      // ハンドル検索
      const q = query(collection(db, 'users'), where('handle', '==', 'bob'));
      const snapshot = await getDocs(q);

      expect(snapshot.size).toBe(1);
      expect(snapshot.docs[0].data().displayName).toBe('Bob');
    });
  });

  describe('アルバムリポジトリ', () => {
    test('アルバムを作成して取得できる', async () => {
      const db = getAuthenticatedFirestore('alice');

      // ユーザー作成
      const user = createUser({ uid: 'alice' });
      await setDoc(doc(db, 'users', user.uid), user);

      // アルバム作成
      const album = createAlbum({ id: 'album1', ownerId: 'alice', title: 'テストアルバム' });
      await setDoc(doc(db, 'albums', album.id), album);

      // 取得
      const snapshot = await getDoc(doc(db, 'albums', 'album1'));
      expect(snapshot.exists()).toBe(true);

      const retrieved = snapshot.data() as AlbumDoc;
      expect(retrieved.title).toBe('テストアルバム');
      expect(retrieved.ownerId).toBe('alice');
    });

    test('オーナーでアルバムを検索できる', async () => {
      const db = getAuthenticatedFirestore('admin');
      const users = createSeedUsers();
      await seedDocuments(db, 'users', users.map((u) => ({ id: u.uid, data: u })));

      const albums = createSeedAlbums(users.map((u) => u.uid));
      await seedDocuments(db, 'albums', albums.map((a) => ({ id: a.id, data: a })));

      // Alice のアルバムを検索
      const q = query(collection(db, 'albums'), where('ownerId', '==', 'alice'));
      const snapshot = await getDocs(q);

      expect(snapshot.size).toBeGreaterThan(0);
      snapshot.docs.forEach((doc) => {
        expect(doc.data().ownerId).toBe('alice');
      });
    });

    test('公開アルバムのみを取得できる', async () => {
      const db = getAuthenticatedFirestore('admin');

      // 公開・非公開アルバムを混在
      const albums = [
        createAlbum({ id: 'public1', ownerId: 'alice', visibility: 'public' }),
        createAlbum({ id: 'friends1', ownerId: 'alice', visibility: 'friends' }),
        createAlbum({ id: 'public2', ownerId: 'bob', visibility: 'public' }),
      ];
      await seedDocuments(db, 'albums', albums.map((a) => ({ id: a.id, data: a })));

      // 公開のみ検索
      const q = query(collection(db, 'albums'), where('visibility', '==', 'public'));
      const snapshot = await getDocs(q);

      expect(snapshot.size).toBe(2);
      snapshot.docs.forEach((doc) => {
        expect(doc.data().visibility).toBe('public');
      });
    });
  });
});

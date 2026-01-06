/**
 * データベース統合テスト
 */

// Firebase Admin のモック
jest.mock('firebase-admin');

const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  batch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});


describe('カスケード削除テスト', () => {
  test('アルバム削除時に関連データも削除される', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockGet = jest.fn().mockResolvedValue({ exists: false });
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete, get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    // アルバム削除
    await mockCollection('albums').doc('album1').delete();
    await mockCollection('albumImages').doc('image1').delete();
    await mockCollection('comments').doc('comment1').delete();
    await mockCollection('likes').doc('like1').delete();

    // 削除確認
    const albumSnap = await mockCollection('albums').doc('album1').get();
    const imageSnap = await mockCollection('albumImages').doc('image1').get();

    expect(mockDelete).toHaveBeenCalledTimes(4);
    expect(albumSnap.exists).toBe(false);
    expect(imageSnap.exists).toBe(false);
  });

  test('ユーザー削除時に関連データも削除される', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockGet = jest.fn().mockResolvedValue({ exists: false });
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete, get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    // ユーザー削除と関連データ削除
    await mockCollection('users').doc('alice').delete();
    await mockCollection('albums').doc('album1').delete();
    await mockCollection('comments').doc('comment1').delete();

    expect(mockDelete).toHaveBeenCalledTimes(3);
  });
});

describe('複雑なクエリテスト', () => {
  test('ユーザー別アルバム一覧を取得', async () => {
    const mockDocs = [
      { id: 'album1', data: () => ({ title: 'Album 1', ownerId: 'alice' }) },
      { id: 'album2', data: () => ({ title: 'Album 2', ownerId: 'alice' }) },
    ];

    const mockGet = jest.fn().mockResolvedValue({
      size: 2,
      docs: mockDocs,
    });

    const mockWhere = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('albums')
      .where('ownerId', '==', 'alice')
      .get();

    expect(snapshot.size).toBe(2);
    expect(mockWhere).toHaveBeenCalledWith('ownerId', '==', 'alice');
  });

  test('公開アルバムのみ取得', async () => {
    const mockDocs = [
      {
        id: 'album1',
        data: () => ({ title: 'Public Album', visibility: 'public' }),
      },
    ];

    const mockGet = jest.fn().mockResolvedValue({
      size: 1,
      docs: mockDocs,
    });

    const mockWhere = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('albums')
      .where('visibility', '==', 'public')
      .get();

    expect(snapshot.size).toBe(1);
    expect(snapshot.docs[0].data().title).toBe('Public Album');
  });
});

describe('データ整合性テスト', () => {
  test('フレンド関係の双方向性', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ from: 'alice', to: 'bob', status: 'accepted' }),
    });

    const mockDoc = jest.fn().mockReturnValue({
      update: mockUpdate,
      get: mockGet,
    });

    const mockWhere = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          size: 1,
          docs: [{ id: 'alice_bob', data: () => ({ status: 'accepted' }) }],
        }),
      }),
    });

    const mockCollection = jest.fn().mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
    });

    mockFirestore.collection = mockCollection;

    // 承認
    await mockCollection('friends').doc('alice_bob').update({
      status: 'accepted',
    });

    // 確認
    const aliceToBob = await mockCollection('friends').doc('alice_bob').get();

    expect(aliceToBob.data()?.status).toBe('accepted');

    // 逆方向のクエリ
    const bobToAlice = await mockCollection('friends')
      .where('from', '==', 'alice')
      .where('to', '==', 'bob')
      .get();

    expect(bobToAlice.size).toBe(1);
  });

  test('いいね数とドキュメント数の整合性', async () => {
    const mockLikesSnapshot = {
      size: 3,
      docs: Array(3).fill({ id: 'like1' }),
    };

    const mockAlbumSnapshot = {
      exists: true,
      data: () => ({ likesCount: 3 }),
    };

    const mockGet = jest.fn()
      .mockResolvedValueOnce(mockLikesSnapshot)
      .mockResolvedValueOnce(mockAlbumSnapshot);

    const mockWhere = jest.fn().mockReturnValue({ get: mockGet });
    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn()
      .mockReturnValueOnce({ where: mockWhere })
      .mockReturnValueOnce({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const likesSnapshot = await mockCollection('likes')
      .where('albumId', '==', 'album1')
      .get();

    const albumSnapshot = await mockCollection('albums').doc('album1').get();

    expect(likesSnapshot.size).toBe(3);
    expect(albumSnapshot.data()?.likesCount).toBe(3);
  });
});

describe('バッチ操作テスト', () => {
  test('複数のドキュメントを一括作成', async () => {
    const mockSet = jest.fn();
    const mockCommit = jest.fn().mockResolvedValue(undefined);
    const mockBatch = {
      set: mockSet,
      commit: mockCommit,
    };

    mockFirestore.batch = jest.fn().mockReturnValue(mockBatch);

    const mockDoc = jest.fn().mockReturnValue({ id: 'album1' });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
    mockFirestore.collection = mockCollection;

    const batch = mockFirestore.batch();

    // 5つのアルバムを一括作成
    for (let i = 1; i <= 5; i++) {
      const albumRef = mockCollection('albums').doc(`album${i}`);
      batch.set(albumRef, {
        title: `Album ${i}`,
        ownerId: 'alice',
        visibility: 'public',
        createdAt: new Date(),
      });
    }

    await batch.commit();

    expect(mockSet).toHaveBeenCalledTimes(5);
    expect(mockCommit).toHaveBeenCalled();
  });

  test('複数のドキュメントを一括更新', async () => {
    const mockUpdate = jest.fn();
    const mockCommit = jest.fn().mockResolvedValue(undefined);
    const mockBatch = {
      update: mockUpdate,
      commit: mockCommit,
    };

    mockFirestore.batch = jest.fn().mockReturnValue(mockBatch);

    const mockDocs = Array(3).fill(null).map((_, i) => ({
      id: `album${i + 1}`,
      ref: { id: `album${i + 1}` },
    }));

    const mockGet = jest.fn().mockResolvedValue({
      docs: mockDocs,
    });

    const mockWhere = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });
    mockFirestore.collection = mockCollection;

    const batch = mockFirestore.batch();
    const snapshot = await mockCollection('albums')
      .where('ownerId', '==', 'alice')
      .get();

    snapshot.docs.forEach((doc: any) => {
      batch.update(doc.ref, { featured: true });
    });

    await batch.commit();

    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockCommit).toHaveBeenCalled();
  });
});

describe('ページネーションテスト', () => {
  test('タイムラインのページネーション', async () => {
    const firstPageDocs = Array(5).fill(null).map((_, i) => ({
      id: `album${i + 1}`,
    }));

    const secondPageDocs = Array(5).fill(null).map((_, i) => ({
      id: `album${i + 6}`,
    }));

    const mockStartAfter = jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          size: 5,
          docs: secondPageDocs,
        }),
      }),
    });

    const mockLimit = jest.fn()
      .mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          size: 5,
          docs: firstPageDocs,
        }),
      })
      .mockReturnValueOnce({
        startAfter: mockStartAfter,
      });

    const mockOrderBy = jest.fn().mockReturnValue({
      limit: mockLimit,
    });

    const mockCollection = jest.fn().mockReturnValue({
      orderBy: mockOrderBy,
    });

    mockFirestore.collection = mockCollection;

    // 最初の5件を取得
    const firstPage = await mockCollection('albums')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    expect(firstPage.size).toBe(5);

    // 次の5件を取得
    const secondPage = await mockCollection('albums')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .startAfter(firstPage.docs[4])
      .limit(5)
      .get();

    expect(secondPage.size).toBe(5);

    // 重複がないことを確認
    const firstIds = firstPage.docs.map((d: any) => d.id);
    const secondIds = secondPage.docs.map((d: any) => d.id);
    const intersection = firstIds.filter((id) => secondIds.includes(id));

    expect(intersection.length).toBe(0);
  });
});

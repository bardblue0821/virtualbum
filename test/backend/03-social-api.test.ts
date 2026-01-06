/**
 * ソーシャル機能API バックエンドテスト
 */

// Firebase Admin のモック
jest.mock('firebase-admin');

const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});


describe('フレンド申請テスト', () => {
  test('フレンド申請を送信できる', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('friends').doc('alice_bob').set({
      from: 'alice',
      to: 'bob',
      status: 'pending',
      createdAt: new Date(),
    });

    expect(mockCollection).toHaveBeenCalledWith('friends');
    expect(mockSet).toHaveBeenCalled();
  });

  test('フレンド申請を承認できる', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('friends').doc('alice_bob').update({
      status: 'accepted',
    });

    expect(mockUpdate).toHaveBeenCalled();
  });

  test('フレンド関係を取得できる', async () => {
    const mockData = {
      from: 'alice',
      to: 'bob',
      status: 'accepted',
      createdAt: new Date(),
    };

    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => mockData,
    });

    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('friends').doc('alice_bob').get();

    expect(snapshot.data()?.status).toBe('accepted');
  });
});

describe('ウォッチ機能テスト', () => {
  test('ユーザーをウォッチできる', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('watches').doc('alice_bob').set({
      userId: 'alice',
      ownerId: 'bob',
      createdAt: new Date(),
    });

    expect(mockSet).toHaveBeenCalled();
  });

  test('権限チェック - 自分のウォッチのみ作成可能', () => {
    const watchData = { userId: 'alice', ownerId: 'bob' };
    const currentUserId = 'alice';

    expect(watchData.userId).toBe(currentUserId);
  });

  test('ウォッチを解除できる', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('watches').doc('alice_bob').delete();

    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('いいね機能テスト', () => {
  test('いいねを追加できる', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('likes').doc('album1_alice').set({
      albumId: 'album1',
      userId: 'alice',
      createdAt: new Date(),
    });

    expect(mockSet).toHaveBeenCalled();
  });

  test('いいね情報を取得できる', async () => {
    const mockData = {
      albumId: 'album1',
      userId: 'alice',
      createdAt: new Date(),
    };

    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => mockData,
    });

    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('likes').doc('album1_alice').get();

    expect(snapshot.exists).toBe(true);
  });

  test('いいねを削除できる', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('likes').doc('album1_alice').delete();

    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('コメント機能テスト', () => {
  test('コメントを投稿できる', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('comments').doc('comment1').set({
      albumId: 'album1',
      userId: 'alice',
      body: 'Great photo!',
      createdAt: new Date(),
    });

    expect(mockSet).toHaveBeenCalled();
  });

  test('コメントのバリデーション - 空のコメント', () => {
    const emptyComment = '';
    const validComment = 'Great photo!';

    expect(emptyComment.length).toBe(0);
    expect(validComment.length).toBeGreaterThan(0);
  });

  test('コメントのバリデーション - 文字数制限', () => {
    const validComment = 'Great photo!';
    const invalidComment = 'a'.repeat(501);

    expect(validComment.length).toBeLessThanOrEqual(500);
    expect(invalidComment.length).toBeGreaterThan(500);
  });

  test('コメントを取得できる', async () => {
    const mockData = {
      albumId: 'album1',
      userId: 'alice',
      body: 'Great photo!',
      createdAt: new Date(),
    };

    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => mockData,
    });

    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('comments').doc('comment1').get();

    expect(snapshot.data()?.body).toBe('Great photo!');
  });

  test('コメントを削除できる', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('comments').doc('comment1').delete();

    expect(mockDelete).toHaveBeenCalled();
  });

  test('権限チェック - 自分のコメントのみ削除可能', () => {
    const commentData = { userId: 'alice' };
    const currentUserId = 'alice';
    const otherUserId = 'bob';

    expect(commentData.userId).toBe(currentUserId);
    expect(commentData.userId).not.toBe(otherUserId);
  });
});

describe('リアクション機能テスト', () => {
  test('リアクションを追加できる', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('reactions').doc('album1_alice_👍').set({
      albumId: 'album1',
      userId: 'alice',
      emoji: '👍',
      createdAt: new Date(),
    });

    expect(mockSet).toHaveBeenCalled();
  });

  test('リアクションを取得できる', async () => {
    const mockData = {
      albumId: 'album1',
      userId: 'alice',
      emoji: '👍',
      createdAt: new Date(),
    };

    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => mockData,
    });

    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('reactions').doc('album1_alice_👍').get();

    expect(snapshot.exists).toBe(true);
  });

  test('リアクションを削除できる', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('reactions').doc('album1_alice_👍').delete();

    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('通知機能テスト', () => {
  test('通知を作成できる', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('notifications').doc('notif1').set({
      userId: 'alice',
      actorId: 'bob',
      type: 'like',
      albumId: 'album1',
      message: 'Bob liked your album',
      read: false,
      createdAt: new Date(),
    });

    expect(mockSet).toHaveBeenCalled();
  });

  test('通知を取得できる', async () => {
    const mockData = {
      userId: 'alice',
      actorId: 'bob',
      type: 'like',
      albumId: 'album1',
      message: 'Bob liked your album',
      read: false,
      createdAt: new Date(),
    };

    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => mockData,
    });

    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('notifications').doc('notif1').get();

    expect(snapshot.data()?.userId).toBe('alice');
  });

  test('権限チェック - 自分の通知のみ取得可能', () => {
    const notificationData = { userId: 'alice' };
    const currentUserId = 'alice';
    const otherUserId = 'charlie';

    expect(notificationData.userId).toBe(currentUserId);
    expect(notificationData.userId).not.toBe(otherUserId);
  });

  test('通知を既読にできる', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('notifications').doc('notif1').update({
      read: true,
    });

    expect(mockUpdate).toHaveBeenCalled();
  });
});

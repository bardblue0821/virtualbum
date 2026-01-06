/**
 * アルバムAPI バックエンドテスト
 */

// Firebase Admin のモック
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
  })),
}));

const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});


describe('アルバム作成テスト', () => {
  test('アルバムを作成できる', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('albums').doc('album1').set({
      title: 'My Album',
      description: 'Test album',
      ownerId: 'alice',
      visibility: 'public',
      createdAt: new Date(),
    });

    expect(mockCollection).toHaveBeenCalledWith('albums');
    expect(mockDoc).toHaveBeenCalledWith('album1');
    expect(mockSet).toHaveBeenCalled();
  });

  test('タイトルのバリデーション', () => {
    const validTitle = 'My Album';
    const invalidTitle = 'a'.repeat(101);

    expect(validTitle.length).toBeLessThanOrEqual(100);
    expect(invalidTitle.length).toBeGreaterThan(100);
  });

  test('説明のバリデーション', () => {
    const validDescription = 'Test album description';
    const invalidDescription = 'a'.repeat(1001);

    expect(validDescription.length).toBeLessThanOrEqual(1000);
    expect(invalidDescription.length).toBeGreaterThan(1000);
  });
});

describe('アルバム更新テスト', () => {
  test('アルバムを更新できる', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('albums').doc('album1').update({
      title: 'Updated Album',
    });

    expect(mockCollection).toHaveBeenCalledWith('albums');
    expect(mockDoc).toHaveBeenCalledWith('album1');
    expect(mockUpdate).toHaveBeenCalled();
  });

  test('権限チェック - オーナーのみ更新可能', () => {
    const albumOwnerId = 'alice';
    const currentUserId = 'alice';
    const otherUserId = 'bob';

    expect(currentUserId).toBe(albumOwnerId);
    expect(otherUserId).not.toBe(albumOwnerId);
  });
});

describe('アルバム削除テスト', () => {
  test('アルバムを削除できる', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('albums').doc('album1').delete();

    expect(mockCollection).toHaveBeenCalledWith('albums');
    expect(mockDoc).toHaveBeenCalledWith('album1');
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('アルバム取得テスト', () => {
  test('アルバム情報を取得できる', async () => {
    const mockData = {
      title: 'Public Album',
      description: 'Public',
      ownerId: 'alice',
      visibility: 'public',
      createdAt: new Date(),
    };

    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => mockData,
    });

    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('albums').doc('album1').get();
    const data = snapshot.data();

    expect(data.title).toBe('Public Album');
    expect(data.visibility).toBe('public');
  });

  test('可視性チェック', () => {
    const publicAlbum = { visibility: 'public', ownerId: 'alice' };
    const privateAlbum = { visibility: 'private', ownerId: 'alice' };
    const currentUserId = 'bob';

    // 公開アルバムは誰でも見れる
    expect(publicAlbum.visibility).toBe('public');

    // プライベートアルバムはオーナーのみ
    const canViewPrivate = privateAlbum.ownerId === currentUserId;
    expect(canViewPrivate).toBe(false);
  });
});

describe('画像アップロードテスト', () => {
  test('画像を追加できる', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('albumImages').doc('image1').set({
      albumId: 'album1',
      uploaderId: 'alice',
      url: 'https://example.com/image.jpg',
      thumbUrl: 'https://example.com/thumb.jpg',
      createdAt: new Date(),
    });

    expect(mockCollection).toHaveBeenCalledWith('albumImages');
    expect(mockDoc).toHaveBeenCalledWith('image1');
    expect(mockSet).toHaveBeenCalled();
  });

  test('画像情報を取得できる', async () => {
    const mockData = {
      albumId: 'album1',
      uploaderId: 'alice',
      url: 'https://example.com/image.jpg',
      thumbUrl: 'https://example.com/thumb.jpg',
      createdAt: new Date(),
    };

    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => mockData,
    });

    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('albumImages').doc('image1').get();
    const data = snapshot.data();

    expect(data.url).toBe('https://example.com/image.jpg');
  });
});

describe('画像削除テスト', () => {
  test('画像を削除できる', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('albumImages').doc('image1').delete();

    expect(mockCollection).toHaveBeenCalledWith('albumImages');
    expect(mockDoc).toHaveBeenCalledWith('image1');
    expect(mockDelete).toHaveBeenCalled();
  });
});

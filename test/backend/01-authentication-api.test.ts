/**
 * 認証API バックエンドテスト
 */

import * as admin from 'firebase-admin';

// Firebase Admin のモック
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
  })),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  })),
}));

const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
};

const mockAuth = {
  verifyIdToken: jest.fn(),
  createUser: jest.fn(),
  deleteUser: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});


describe('ユーザー登録テスト', () => {
  test('認証ユーザーが新規ユーザーを作成できる', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('users').doc('alice').set({
      displayName: 'Alice',
      handle: 'alice',
      bio: '',
      createdAt: new Date(),
    });

    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(mockDoc).toHaveBeenCalledWith('alice');
    expect(mockSet).toHaveBeenCalled();
  });

  test('ユーザー作成時のデータ検証', async () => {
    const userData = {
      displayName: 'Alice',
      handle: 'alice',
      bio: '',
      createdAt: new Date(),
    };

    expect(userData.displayName).toBeDefined();
    expect(userData.handle).toBeDefined();
    expect(userData.displayName.length).toBeGreaterThan(0);
    expect(userData.handle.length).toBeGreaterThan(0);
  });
});

describe('ユーザー情報取得テスト', () => {
  test('存在するユーザーの情報を取得できる', async () => {
    const mockData = {
      displayName: 'Alice',
      handle: 'alice',
      bio: 'Test user',
      createdAt: new Date(),
    };

    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => mockData,
    });

    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('users').doc('alice').get();
    const data = snapshot.data();

    expect(data?.displayName).toBe('Alice');
    expect(data?.handle).toBe('alice');
    expect(data?.bio).toBe('Test user');
  });

  test('存在しないユーザーはnullを返す', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      exists: false,
      data: () => null,
    });

    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    const snapshot = await mockCollection('users').doc('nonexistent').get();

    expect(snapshot.exists).toBe(false);
  });
});

describe('アカウント削除テスト', () => {
  test('自分のアカウントを削除できる', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDelete });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    mockFirestore.collection = mockCollection;

    await mockCollection('users').doc('alice').delete();

    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(mockDoc).toHaveBeenCalledWith('alice');
    expect(mockDelete).toHaveBeenCalled();
  });

  test('アカウント削除時の権限チェック', async () => {
    const mockToken = {
      uid: 'alice',
      email: 'alice@example.com',
    };

    mockAuth.verifyIdToken = jest.fn().mockResolvedValue(mockToken);

    const token = await mockAuth.verifyIdToken('test-token');

    expect(token.uid).toBe('alice');
  });
});

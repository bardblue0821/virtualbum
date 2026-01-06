/**
 * Firebase Firestore の共通モック
 */

// モック関数
export const mockGetDoc = jest.fn();
export const mockSetDoc = jest.fn();
export const mockUpdateDoc = jest.fn();
export const mockDeleteDoc = jest.fn();
export const mockAddDoc = jest.fn();
export const mockGetDocs = jest.fn();

// ドキュメントスナップショットのモック
export function createMockDocSnapshot(data: any, exists: boolean = true) {
  return {
    exists: () => exists,
    data: () => data,
    id: data?.id || 'mock-doc-id',
    ref: { id: data?.id || 'mock-doc-id' },
  };
}

// クエリスナップショットのモック
export function createMockQuerySnapshot(docs: any[]) {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map((data, i) => ({
      data: () => data,
      id: data?.id || `doc-${i}`,
      exists: () => true,
    })),
    forEach: (callback: (doc: any) => void) => {
      docs.forEach((data, i) => {
        callback({
          data: () => data,
          id: data?.id || `doc-${i}`,
          exists: () => true,
        });
      });
    },
  };
}

// デフォルトのモック設定
export function setupFirestoreMock() {
  return {
    getFirestore: jest.fn(),
    initializeFirestore: jest.fn(),
    doc: jest.fn().mockReturnValue({}),
    collection: jest.fn().mockReturnValue({}),
    query: jest.fn().mockReturnValue({}),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    startAfter: jest.fn(),
    getDoc: mockGetDoc,
    getDocs: mockGetDocs,
    setDoc: mockSetDoc,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
    addDoc: mockAddDoc,
    serverTimestamp: jest.fn().mockReturnValue(new Date()),
    Timestamp: {
      now: jest.fn().mockReturnValue({ toDate: () => new Date() }),
      fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
    },
  };
}

// すべてのモックをリセット
export function resetFirestoreMocks() {
  mockGetDoc.mockReset();
  mockSetDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockDeleteDoc.mockReset();
  mockAddDoc.mockReset();
  mockGetDocs.mockReset();
}

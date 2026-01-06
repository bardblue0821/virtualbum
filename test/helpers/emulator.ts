/**
 * Firebase Emulator テストヘルパー
 * エミュレータ接続、データクリーンアップ、認証ヘルパー
 */

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  Firestore,
} from 'firebase/firestore';

// エミュレータ設定
export const EMULATOR_CONFIG = {
  projectId: 'virtualbum-test',
  auth: { host: 'localhost', port: 9099 },
  firestore: { host: 'localhost', port: 8080 },
  storage: { host: 'localhost', port: 9199 },
};

let testEnv: RulesTestEnvironment | null = null;

/**
 * テスト環境を初期化
 */
export async function setupTestEnvironment(): Promise<RulesTestEnvironment> {
  if (testEnv) {
    return testEnv;
  }

  testEnv = await initializeTestEnvironment({
    projectId: EMULATOR_CONFIG.projectId,
    firestore: {
      host: EMULATOR_CONFIG.firestore.host,
      port: EMULATOR_CONFIG.firestore.port,
      rules: `
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            // テスト用に全て許可
            match /{document=**} {
              allow read, write: if true;
            }
          }
        }
      `,
    },
  });

  return testEnv;
}

/**
 * Firestore の全データをクリア
 */
export async function clearFirestoreData(): Promise<void> {
  if (!testEnv) {
    throw new Error('Test environment not initialized. Call setupTestEnvironment first.');
  }
  await testEnv.clearFirestore();
}

/**
 * テスト環境をクリーンアップ
 */
export async function cleanupTestEnvironment(): Promise<void> {
  if (testEnv) {
    await testEnv.cleanup();
    testEnv = null;
  }
}

/**
 * 認証済みユーザーとして Firestore にアクセス
 */
export function getAuthenticatedFirestore(userId: string): Firestore {
  if (!testEnv) {
    throw new Error('Test environment not initialized. Call setupTestEnvironment first.');
  }
  return testEnv.authenticatedContext(userId).firestore();
}

/**
 * 未認証ユーザーとして Firestore にアクセス
 */
export function getUnauthenticatedFirestore(): Firestore {
  if (!testEnv) {
    throw new Error('Test environment not initialized. Call setupTestEnvironment first.');
  }
  return testEnv.unauthenticatedContext().firestore();
}

/**
 * Admin として Firestore にアクセス (ルールバイパス)
 */
export function getAdminFirestore(): Firestore {
  if (!testEnv) {
    throw new Error('Test environment not initialized. Call setupTestEnvironment first.');
  }
  // @ts-expect-error - rules-unit-testing の型が不完全
  return testEnv.withSecurityRulesDisabled((context) => context.firestore());
}

/**
 * テストユーティリティをエクスポート
 */
export { assertSucceeds, assertFails };

/**
 * コレクション内の全ドキュメントを削除
 */
export async function clearCollection(db: Firestore, collectionPath: string): Promise<void> {
  const q = query(collection(db, collectionPath));
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map((docSnapshot) =>
    deleteDoc(docSnapshot.ref)
  );
  await Promise.all(deletePromises);
}

/**
 * 複数ドキュメントを一括作成 (バッチシード)
 */
export async function seedDocuments<T extends object>(
  db: Firestore,
  collectionPath: string,
  documents: Array<{ id: string; data: T }>
): Promise<void> {
  const promises = documents.map(({ id, data }) =>
    setDoc(doc(db, collectionPath, id), data as Record<string, unknown>)
  );
  await Promise.all(promises);
}

/**
 * ドキュメントを取得
 */
export async function getDocument<T>(
  db: Firestore,
  collectionPath: string,
  docId: string
): Promise<T | null> {
  const docRef = doc(db, collectionPath, docId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? (snapshot.data() as T) : null;
}

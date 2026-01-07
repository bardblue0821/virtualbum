import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestContext,
} from '@firebase/rules-unit-testing';

export const EMULATOR_CONFIG = {
  projectId: 'virtualbum-test',
  auth: { host: 'localhost', port: 9099 },
  firestore: { host: 'localhost', port: 8080 },
  storage: { host: 'localhost', port: 9199 },
};

let testEnv: RulesTestEnvironment | null = null;

function loadFirestoreRules(): string {
  const rulesPath = path.resolve(__dirname, '../../firestore.rules');
  if (fs.existsSync(rulesPath)) {
    return fs.readFileSync(rulesPath, 'utf8');
  }
  return 'rules_version = "2"; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if true; } } }';
}

export async function setupTestEnvironment(): Promise<RulesTestEnvironment> {
  if (testEnv) return testEnv;
  const rules = loadFirestoreRules();
  console.log('Loading firestore.rules for emulator testing');
  testEnv = await initializeTestEnvironment({
    projectId: EMULATOR_CONFIG.projectId,
    firestore: {
      host: EMULATOR_CONFIG.firestore.host,
      port: EMULATOR_CONFIG.firestore.port,
      rules,
    },
  });
  return testEnv;
}

export async function clearFirestoreData(): Promise<void> {
  if (!testEnv) throw new Error('Test environment not initialized');
  await testEnv.clearFirestore();
}

export async function cleanupTestEnvironment(): Promise<void> {
  if (testEnv) {
    await testEnv.cleanup();
    testEnv = null;
  }
}

export function getAuthenticatedContext(userId: string): RulesTestContext {
  if (!testEnv) throw new Error('Test environment not initialized');
  return testEnv.authenticatedContext(userId);
}

export function getUnauthenticatedContext(): RulesTestContext {
  if (!testEnv) throw new Error('Test environment not initialized');
  return testEnv.unauthenticatedContext();
}

export async function withAdminContext(
  callback: (context: RulesTestContext) => Promise<void>
): Promise<void> {
  if (!testEnv) throw new Error('Test environment not initialized');
  await testEnv.withSecurityRulesDisabled(callback);
}

export { assertSucceeds, assertFails };

export async function adminSetDoc(
  collectionPath: string,
  docId: string,
  data: Record<string, unknown>
): Promise<void> {
  await withAdminContext(async (context) => {
    const db = context.firestore();
    await db.collection(collectionPath).doc(docId).set(data);
  });
}

export async function adminGetDoc(
  collectionPath: string,
  docId: string
): Promise<Record<string, unknown> | null> {
  let result: Record<string, unknown> | null = null;
  await withAdminContext(async (context) => {
    const db = context.firestore();
    const snapshot = await db.collection(collectionPath).doc(docId).get();
    result = snapshot.exists ? (snapshot.data() as Record<string, unknown>) : null;
  });
  return result;
}

export async function adminSeedDocuments(
  collectionPath: string,
  documents: Array<{ id: string; data: Record<string, unknown> }>
): Promise<void> {
  await withAdminContext(async (context) => {
    const db = context.firestore();
    const batch = db.batch();
    documents.forEach(({ id, data }) => {
      const ref = db.collection(collectionPath).doc(id);
      batch.set(ref, data);
    });
    await batch.commit();
  });
}

export async function adminGetDocs(
  collectionPath: string
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const results: Array<{ id: string; data: Record<string, unknown> }> = [];
  await withAdminContext(async (context) => {
    const db = context.firestore();
    const snapshot = await db.collection(collectionPath).get();
    snapshot.forEach((doc) => {
      results.push({ id: doc.id, data: doc.data() as Record<string, unknown> });
    });
  });
  return results;
}

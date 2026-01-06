import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@/lib/logger';

const log = createLogger('firebaseAdmin');
let _initialized = false;

function init() {
  if (_initialized) return;
  try {
    if (!admin.apps.length) {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const creds = process.env.FIREBASE_ADMIN_CREDENTIALS;
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
      
      log.debug('initializing', { projectId, hasCreds: !!creds, hasCredPath: !!credPath });
      
      if (credPath) {
        const absolutePath = path.resolve(process.cwd(), credPath);
        const serviceAccountJson = fs.readFileSync(absolutePath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId || serviceAccount.project_id
        });
      } else if (creds) {
        const json = JSON.parse(creds);
        admin.initializeApp({ credential: admin.credential.cert(json), projectId: projectId || json.project_id });
      } else {
        admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
      }
    }
    _initialized = true;
    log.debug('initialization complete');
  } catch (e) {
    log.error('init failed:', e);
  }
}

export async function verifyIdToken(token: string): Promise<any | null> {
  init();
  try {
    return await admin.auth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export function getAdminAuth() {
  init();
  try {
    const auth = admin.auth();
    if (!auth) {
      log.error('auth is null');
      throw new Error('ADMIN_AUTH_NOT_INITIALIZED');
    }
    return auth;
  } catch (e) {
    log.error('getAdminAuth error:', e);
    throw new Error('ADMIN_AUTH_NOT_INITIALIZED');
  }
}

export function getAdminDb() {
  init();
  try {
    const db = admin.firestore();
    if (!db) {
      log.error('firestore is null');
      throw new Error('ADMIN_DB_NOT_INITIALIZED');
    }
    return db;
  } catch (e) {
    log.error('getAdminDb error:', e);
    throw new Error('ADMIN_DB_NOT_INITIALIZED');
  }
}

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
// import { getAnalytics } from 'firebase/analytics' // ブラウザ限定で使う場合のみ

// エミュレータ設定
const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
}

// HMR や再レンダーで二重初期化しないためのパターン
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
let _db;
try {
    _db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch {
    _db = getFirestore(app);
}
export const db = _db
export const storage = getStorage(app)
export const functions = getFunctions(app)
// export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

// エミュレータに接続（開発環境のみ）
if (USE_EMULATOR && typeof window !== 'undefined') {
    console.log('🔧 Connecting to Firebase Emulators...')
    try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
        connectFirestoreEmulator(db, 'localhost', 8080)
        connectStorageEmulator(storage, 'localhost', 9199)
        connectFunctionsEmulator(functions, 'localhost', 5001)
        console.log('✅ Connected to Firebase Emulators')
    } catch (e) {
        // 既に接続済みの場合はエラーを無視
        console.log('⚠️ Firebase Emulators already connected or connection failed:', e)
    }
}
# Firebase エミュレータ テストガイド

## 概要

Firebase エミュレータを使用して、本番環境に影響を与えずにローカルでテストを行う方法をまとめます。

---

## 前提条件

- Node.js v18+
- Java JDK 11+（エミュレータ実行に必要）
- Firebase CLI (`npm install -g firebase-tools`)

---

## 1. エミュレータの起動

### 1.1 Java の設定（Windows）

```bash
# Java のパスを設定（例）
export JAVA_HOME="/c/Users/tommagom/java/jdk-21.0.9+10"
export PATH="$JAVA_HOME/bin:$PATH"
```

### 1.2 エミュレータ起動

```bash
cd virtualbum
npx firebase emulators:start
```

起動されるエミュレータ：

| サービス | ポート | UI |
|----------|--------|-----|
| Emulator UI | 4000 | http://localhost:4000 |
| Auth | 9099 | http://localhost:4000/auth |
| Firestore | 8080 | http://localhost:4000/firestore |
| Storage | 9199 | http://localhost:4000/storage |
| Functions | 5001 | http://localhost:4000/functions |

---

## 2. シードデータの投入

### 2.1 コマンド

```bash
# データをリセットして投入
npm run seed:reset && npm run seed:small

# 各サイズ
npm run seed:small   # 10ユーザー、20アルバム
npm run seed:medium  # 50ユーザー、150アルバム
npm run seed:large   # 100ユーザー、300アルバム

# リセットのみ
npm run seed:reset
```

### 2.2 シードで作成されるデータ

| データ | 説明 |
|--------|------|
| users | テストユーザー（Auth + Firestore） |
| albums | アルバム（public/friends） |
| albumImages | 画像（picsum.photos の外部URL） |
| friends | フレンド関係（accepted） |
| watches | ウォッチ関係 |
| comments | コメント |
| likes | いいね |
| reactions | リアクション |

### 2.3 ログイン情報

```
メール: user0@test.local 〜 user9@test.local
パスワード: password123
```

---

## 3. 開発サーバーの起動

### 3.1 エミュレータモードで起動

```bash
npm run dev:emulator
```

これにより `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` が設定され、アプリがエミュレータに接続します。

### 3.2 アクセス URL

- アプリ: http://localhost:3000
- エミュレータ UI: http://localhost:4000

---

## 4. 環境変数

### 4.1 クライアント側（自動接続）

`lib/firebase.ts` で `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` を検出し、自動的にエミュレータに接続：

```typescript
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

### 4.2 サーバー側（Admin SDK）

`src/libs/firebaseAdmin.ts` で同様に検出：

```typescript
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  admin.initializeApp({ projectId: 'instavram3' });
}
```

---

## 5. エミュレータでできること / できないこと

### ✅ できること

| 機能 | 説明 |
|------|------|
| Firestore CRUD | データの読み書き、クエリ |
| Auth ログイン | メール/パスワード認証 |
| リアルタイム更新 | onSnapshot など |
| Admin SDK 操作 | サーバーサイドからのデータ操作 |
| セキュリティルールテスト | ルールの検証 |

### ❌ できないこと / 制限があること

| 機能 | 説明 | 回避策 |
|------|------|--------|
| Storage アップロード | クライアントからの直接アップロードが不安定 | 外部 URL（picsum.photos）を使用 |
| ソーシャルログイン | Google/Twitter 等は使用不可 | メール/パスワードで代用 |
| Cloud Functions | 別途ビルドが必要 | レート制限等をスキップ設定 |
| FCM プッシュ通知 | 使用不可 | - |

---

## 6. トラブルシューティング

### 6.1 ポートが使用中

```bash
# 使用中のポートを確認
netstat -ano | grep -E "8080|9099|9199|4000"

# プロセスを終了（Windows）
taskkill //F //PID <PID番号>

# または Java プロセスをすべて終了
taskkill //F //IM java.exe
```

### 6.2 エミュレータが接続できない

1. エミュレータが起動しているか確認
2. `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` が設定されているか確認
3. dev サーバーを `npm run dev:emulator` で起動しているか確認

### 6.3 ALBUM_NOT_FOUND エラー

API Route（サーバーサイド）が Admin SDK でエミュレータに接続できていない可能性：

1. `src/libs/firebaseAdmin.ts` でエミュレータ判定が正しいか確認
2. dev サーバーを再起動
3. `.next` キャッシュを削除: `rm -rf .next`

### 6.4 Storage アップロードエラー

`ERR_CONNECTION_REFUSED` on port 9199:

- Storage エミュレータは不安定な場合がある
- 代替案: 画像は外部 URL を直接使用

---

## 7. 推奨ワークフロー

```
1. ターミナル1: Firebase エミュレータを起動
   $ npx firebase emulators:start

2. ターミナル2: シードデータを投入
   $ npm run seed:small

3. ターミナル3: dev サーバーを起動
   $ npm run dev:emulator

4. ブラウザ: http://localhost:3000 でテスト
   - user0@test.local / password123 でログイン
```

---

## 8. 関連ファイル

| ファイル | 説明 |
|----------|------|
| `firebase.json` | エミュレータ設定 |
| `scripts/seed-emulator.ts` | シードスクリプト |
| `scripts/seed-patterns.ts` | シードデータパターン |
| `lib/firebase.ts` | クライアント SDK 初期化 |
| `src/libs/firebaseAdmin.ts` | Admin SDK 初期化 |
| `package.json` | npm scripts（dev:emulator, seed:*） |

---

## 9. 今後の改善案

1. **Docker 化**: Firebase エミュレータを Docker で起動し、環境を完全に隔離
2. **Storage モック**: 画像アップロードをモック化し、外部 URL を使用
3. **E2E テスト**: Playwright/Cypress でエミュレータを使った自動テスト

---

*最終更新: 2026-01-07*

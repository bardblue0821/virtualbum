# セキュリティ テスト仕様書

## テスト対象
- 認証・認可
- Firestore Security Rules
- XSS（クロスサイトスクリプティング）対策
- CSRF（クロスサイトリクエストフォージェリ）対策
- データ検証
- レート制限

---

## 1. 認証・認可

### 1.1 認証機能のテスト

#### テストケース 1.1.1: 未ログイン状態でのアクセス制御
**テスト手順:**
1. ログアウト状態で `/timeline` にアクセス

**期待結果:**
- `/login` にリダイレクト
- タイムラインの内容は表示されない

#### テストケース 1.1.2: トークンの有効期限切れ
**テスト手順:**
1. Firebase Auth トークンを手動で期限切れにする
2. API リクエストを送信

**期待結果:**
- 401エラーが返される
- 自動的にログアウトまたはトークンリフレッシュ

#### テストケース 1.1.3: パスワードの強度要件
**テスト手順:**
1. 新規登録で "12345" というパスワードを設定

**期待結果:**
- エラー「パスワードは8文字以上で、大文字、小文字、数字を含む必要があります」

---

### 1.2 認可（権限管理）のテスト

#### テストケース 1.2.1: 他人のアルバム編集試行
**前提条件:**
- user1 が作成したアルバムが存在
- user2 でログイン

**テスト手順:**
1. user2 で user1 のアルバム編集APIを直接呼び出し

**期待結果:**
- 403エラーが返される
- Firestore Rules により拒否される

#### テストケース 1.2.2: 他人のプロフィール編集試行
**テスト手順:**
1. user2 で user1 のプロフィール更新APIを呼び出し

**期待結果:**
- 403エラーが返される

---

## 2. Firestore Security Rules

### 2.1 読み取り権限のテスト

#### テストケース 2.1.1: 公開アルバムの読み取り
**前提条件:**
- user1 が public アルバムを作成

**テスト手順:**
1. 未ログインユーザーでアルバムを取得

**期待結果:**
- アルバムを読み取れる

#### テストケース 2.1.2: 非公開アルバムの読み取り制限
**前提条件:**
- user1 が private アルバムを作成

**テスト手順:**
1. user2 でアルバムを取得

**期待結果:**
- `permission-denied` エラー
- アルバムを読み取れない

#### テストケース 2.1.3: フレンド限定アルバムの読み取り
**前提条件:**
- user1 が friends アルバムを作成
- user2 が user1 のフレンド

**テスト手順:**
1. user2 でアルバムを取得

**期待結果:**
- アルバムを読み取れる

---

### 2.2 書き込み権限のテスト

#### テストケース 2.2.1: 自分のデータのみ書き込み可能
**テスト手順:**
1. user1 で user2 のプロフィールを更新しようと試みる

**期待結果:**
- `permission-denied` エラー

#### テストケース 2.2.2: いいねの重複防止
**テスト手順:**
1. user1 で image1 にいいね
2. 同じいいねドキュメントを再度作成しようと試みる

**期待結果:**
- Firestore Rules により拒否される

---

## 3. XSS（クロスサイトスクリプティング）対策

### 3.1 入力値のサニタイズテスト

#### テストケース 3.1.1: プロフィール表示名にスクリプト挿入
**テスト手順:**
1. 表示名に `<script>alert('XSS')</script>` を設定
2. プロフィールページを表示

**期待結果:**
- スクリプトは実行されず、テキストとして表示される
- React の自動エスケープが機能

#### テストケース 3.1.2: コメントにスクリプト挿入
**テスト手順:**
1. コメントに `<img src=x onerror=alert('XSS')>` を投稿
2. コメント一覧を表示

**期待結果:**
- スクリプトは実行されず、テキストとして表示される

#### テストケース 3.1.3: URLにスクリプト挿入
**テスト手順:**
1. プロフィールのVRChat URLに `javascript:alert('XSS')` を設定
2. URLをクリック

**期待結果:**
- URL検証により拒否される
- または無害化される

---

## 4. CSRF（クロスサイトリクエストフォージェリ）対策

### 4.1 CSRF対策のテスト

#### テストケース 4.1.1: 外部サイトからのリクエスト
**テスト手順:**
1. 外部サイトから POST リクエストを送信

**期待結果:**
- Firebase Auth トークンが必要なため、リクエストが拒否される
- SameSite Cookie 設定により保護される

---

## 5. データ検証

### 5.1 入力値検証のテスト

#### テストケース 5.1.1: ユーザーIDの形式検証
**テスト手順:**
1. ユーザーIDに `user@123` を設定

**期待結果:**
- エラー「ユーザーIDは英数字とアンダースコアのみ使用できます」

#### テストケース 5.1.2: 文字数制限の検証
**テスト手順:**
1. 表示名に101文字を入力

**期待結果:**
- エラー「100文字以内で入力してください」

#### テストケース 5.1.3: 必須フィールドの検証
**テスト手順:**
1. アルバムタイトルを空白で作成

**期待結果:**
- エラー「タイトルを入力してください」

---

### 5.2 ファイルアップロード検証のテスト

#### テストケース 5.2.1: ファイルサイズ制限
**テスト手順:**
1. 6MBの画像をアップロード

**期待結果:**
- エラー「5MB以下の画像を選択してください」

#### テストケース 5.2.2: ファイル形式検証
**テスト手順:**
1. .exe ファイルをアップロード

**期待結果:**
- エラー「画像ファイルのみアップロード可能です」

#### テストケース 5.2.3: MIME タイプ検証
**テスト手順:**
1. 拡張子を .jpg に変更した .txt ファイルをアップロード

**期待結果:**
- MIMEタイプチェックにより拒否される

---

## 6. レート制限

### 6.1 APIレート制限のテスト

#### テストケース 6.1.1: フレンド申請の連続送信
**テスト手順:**
1. 10秒間に100回フレンド申請を送信

**期待結果:**
- レート制限エラー「リクエストが多すぎます。しばらく待ってから再試行してください」
- 一定時間アクセスがブロックされる

#### テストケース 6.1.2: コメント投稿の連続送信
**テスト手順:**
1. 1分間に50回コメントを投稿

**期待結果:**
- レート制限エラー

---

## 7. SQL Injection 対策

### 7.1 NoSQLインジェクション対策のテスト

#### テストケース 7.1.1: Firestoreクエリインジェクション
**テスト手順:**
1. 検索クエリに `{ "$gt": "" }` を送信

**期待結果:**
- Firestore SDKにより無害化される
- クエリが正常に実行される（NoSQL注入は発生しない）

---

## 8. セッション管理

### 8.1 セッションセキュリティのテスト

#### テストケース 8.1.1: セッションタイムアウト
**テスト手順:**
1. ログイン後、1時間放置
2. 操作を試行

**期待結果:**
- セッションが無効化される（設定による）
- 再ログインが要求される

#### テストケース 8.1.2: 複数デバイスでのログイン
**テスト手順:**
1. デバイスAでログイン
2. デバイスBでログイン
3. デバイスAで操作

**期待結果:**
- 両方のデバイスでログイン可能（同時ログインを許可する場合）
- または一方が無効化される（設定による）

---

## 9. 環境変数・シークレット管理

### 9.1 シークレット漏洩のテスト

#### テストケース 9.1.1: APIキーの漏洩チェック
**テスト手順:**
1. クライアント側のJavaScriptコードを確認
2. ネットワークタブでリクエストを確認

**期待結果:**
- Firebase Admin SDK のシークレットキーがクライアントに公開されていない
- APIキーは公開されるが、Firestore Rules により保護される

---

## 10. HTTPSの使用

### 10.1 通信の暗号化テスト

#### テストケース 10.1.1: HTTPS接続
**テスト手順:**
1. プロダクション環境でサイトにアクセス

**期待結果:**
- すべての通信がHTTPSで行われる
- HTTP接続は自動的にHTTPSにリダイレクト

---

## テスト環境

### 必要な環境
- Firebase Emulator Suite
- ブラウザ: Chrome DevTools
- ツール: OWASP ZAP, Burp Suite（セキュリティスキャン）

---

## 自動テストの実装

### Jestテストケース例

```typescript
// __tests__/security.test.ts

describe('Security tests', () => {
  it('should prevent XSS in displayName', () => {
    const maliciousName = '<script>alert("XSS")</script>';
    render(<UserProfile displayName={maliciousName} />);
    expect(screen.queryByText('<script>')).toBeInTheDocument();
  });

  it('should reject invalid file types', async () => {
    const file = new File(['content'], 'test.exe', { type: 'application/exe' });
    await expect(uploadImage(file)).rejects.toThrow();
  });

  it('should enforce password strength', async () => {
    await expect(
      registerUser('test@example.com', '12345')
    ).rejects.toThrow('パスワードは8文字以上');
  });
});
```

---

## Firestore Rules テスト例

```typescript
// firestore.rules.test.ts

describe('Firestore Security Rules', () => {
  it('should allow user to read their own profile', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(db.collection('users').doc('user1').get());
  });

  it('should deny user from editing others profile', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(db.collection('users').doc('user2').update({ displayName: 'Hacked' }));
  });

  it('should allow reading public albums', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('albums').where('visibility', '==', 'public').get());
  });

  it('should deny reading private albums', async () => {
    const db = testEnv.authenticatedContext('user2').firestore();
    await assertFails(db.collection('albums').doc('private-album-of-user1').get());
  });
});
```

---

## セキュリティチェックリスト

- [ ] 認証・認可テストが通過
- [ ] Firestore Security Rules テストが通過
- [ ] XSS対策テストが通過
- [ ] CSRF対策が実装済み
- [ ] 入力値検証テストが通過
- [ ] ファイルアップロード検証が通過
- [ ] レート制限が実装済み
- [ ] セッション管理が適切
- [ ] 環境変数が安全に管理されている
- [ ] HTTPSが使用されている
- [ ] OWASP ZAP スキャンで重大な脆弱性なし

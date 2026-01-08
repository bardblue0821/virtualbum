# ブロック機能

## 概要

ユーザー間のブロック機能を提供する。ブロックは一方向で、ブロックした側にのみ効果がある（ブロックされた側は気づかない）。

## ブロックの効果

ユーザーAがユーザーBをブロックした場合：

| 効果 | 説明 |
|------|------|
| タイムライン非表示 | AのタイムラインにBのアルバムが表示されなくなる |
| アルバム閲覧不可 | BがAのアルバムを閲覧できなくなる（403エラー） |
| フレンド申請拒否 | BからAへのフレンド申請が拒否される |
| コメント・リアクション拒否 | BがAのアルバムにコメント・リアクションできなくなる |
| 検索非表示 | Aの検索結果にBが表示されなくなる |

## 副作用

ブロック実行時に以下が**自動解除**される：

- フレンド関係（双方向）
- ウォッチ関係（双方向）
- 既存のフレンド申請（双方向）

## データモデル

```
Firestore:
users/{userId}/blockedUsers/{blockedUserId}
  - blockedAt: Timestamp（ブロック日時）
```

### インデックス

特別なインデックスは不要（サブコレクションへの単純なアクセス）。

## UI/UX

### ブロック操作

- **場所**: ユーザープロフィール画面
- **ボタン**: 「ブロック」ボタン（既存のフレンド申請ボタンの近くに配置）
- **フロー**:
  1. ユーザーが「ブロック」ボタンをクリック
  2. 確認モーダル表示:「このユーザーをブロックしますか？」
  3. モーダルに副作用の説明を表示
  4. 「ブロック」ボタンで実行
  5. 完了トースト表示

### ブロック解除

- **場所**: 既にブロック済みのユーザーのプロフィール画面
- **ボタン**: 「ブロック中」ボタン（ブロック状態を示す）
- **フロー**:
  1. 「ブロック中」ボタンをクリック
  2. 確認モーダル表示:「ブロックを解除しますか？」
  3. 「解除」ボタンで実行
  4. 完了トースト表示

### 通知

- ブロック/解除の**通知は送信しない**（相手に気づかれないように）

## API

### POST /api/block/toggle

ブロック状態をトグルする。

**リクエスト:**
```json
{
  "targetUserId": "string"
}
```

**レスポンス:**
```json
{
  "blocked": true | false
}
```

### GET /api/block/status?targetUserId=xxx

特定ユーザーへのブロック状態を取得。

**レスポンス:**
```json
{
  "blocked": true | false
}
```

## 実装対象ファイル

### 新規作成

| ファイル | 説明 |
|----------|------|
| `lib/repos/blockRepo.ts` | ブロック操作のリポジトリ |
| `app/api/block/toggle/route.ts` | ブロックトグルAPI |
| `app/api/block/status/route.ts` | ブロック状態取得API |
| `components/user/BlockButton.tsx` | ブロックボタンコンポーネント |
| `components/user/BlockConfirmModal.tsx` | ブロック確認モーダル |
| `test/blockRepo.test.ts` | ブロックRepoのテスト |

### 修正対象

| ファイル | 修正内容 |
|----------|----------|
| `app/user/[id]/page.tsx` | ブロックボタンを追加 |
| `src/services/timeline/listLatestAlbums.ts` | ブロックユーザーのアルバムを除外 |
| `lib/repos/searchRepo.ts` | ブロックユーザーを検索結果から除外 |
| `app/album/[id]/page.tsx` | ブロック判定を追加 |
| `lib/repos/friendRepo.ts` | フレンド申請時にブロック判定 |
| `app/api/comments/add/route.ts` | コメント追加時にブロック判定 |
| `app/api/reactions/toggle/route.ts` | リアクション時にブロック判定 |

## セキュリティルール

```javascript
// Firestoreルール
match /users/{userId}/blockedUsers/{blockedId} {
  // 読み取り: 本人のみ
  allow read: if request.auth != null && request.auth.uid == userId;
  // 書き込み: 本人のみ（自分自身はブロック不可）
  allow write: if request.auth != null 
                  && request.auth.uid == userId 
                  && blockedId != userId;
}
```

## テスト方針

### ユニットテスト（Firestoreエミュレータ）

1. ブロック追加/解除の動作
2. ブロック状態の取得
3. ブロック時のフレンド・ウォッチ自動解除
4. ブロックユーザーのタイムライン除外
5. ブロックユーザーの検索除外
6. ブロックユーザーからのフレンド申請拒否
7. ブロックユーザーからのコメント・リアクション拒否

### 手動テスト

1. プロフィール画面でのブロックボタン表示
2. ブロック確認モーダルの動作
3. ブロック解除の動作
4. アルバム詳細画面でのアクセス拒否表示

## 実装順序

1. `lib/repos/blockRepo.ts` - ブロック操作のリポジトリ
2. `test/blockRepo.test.ts` - ブロックRepoのテスト
3. `app/api/block/toggle/route.ts` - ブロックトグルAPI
4. `app/api/block/status/route.ts` - ブロック状態取得API
5. `components/user/BlockButton.tsx` - ブロックボタン
6. `components/user/BlockConfirmModal.tsx` - 確認モーダル
7. `app/user/[id]/page.tsx` - プロフィール画面に統合
8. 各ファイルへのブロック判定追加
9. 統合テスト

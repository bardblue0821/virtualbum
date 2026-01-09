# 18. ミュート機能

## 概要

特定のユーザーをミュートすることで、そのユーザーのコンテンツを自分のタイムラインや通知から非表示にする機能。ブロックと異なり、相手との関係性は維持され、相手からの閲覧も制限しない。

## ブロックとの違い

| 項目 | ブロック | ミュート |
|------|---------|---------|
| 相手に知られるか | いいえ | いいえ |
| 相手のプロフィール閲覧 | 制限あり | 制限なし |
| 相手からの閲覧 | 制限あり | 制限なし |
| フレンド関係 | 解除される | 維持 |
| ウォッチ関係 | 解除される | 維持 |
| コメント・いいね | できない | できる |
| タイムライン表示 | 非表示 | 非表示 |
| 通知 | 届かない | 届かない |

## 効果範囲

ミュートした相手について、以下を非表示にする：

1. **タイムライン**: 相手のアルバムを非表示
2. **コメント**: 相手のコメントを非表示（タイムライン・アルバム詳細の両方）
3. **画像追加通知**: 「〇〇が画像を追加しました」の表示を非表示
4. **通知**: 相手からの通知を非表示（いいね、コメント、リアクション、フレンド申請など）※未実装

## データ構造

### Firestore コレクション

```
users/{userId}/mutedUsers/{mutedUserId}
```

### ドキュメント構造

```typescript
interface MutedUserDoc {
  id: string;        // mutedUserId
  mutedAt: Date;     // ミュート日時
}
```

## UI

### ミュートボタンの配置

プロフィールページのアクションエリアに配置：
```
[フレンド申請] [ウォッチ] [ブロック] [ミュート]
```

### ボタンの状態

| 状態 | ボタンテキスト | variant |
|------|--------------|---------|
| 未ミュート | ミュート | ghost |
| ミュート中 | ミュート中 | accent系 |

### 確認モーダル

ミュート時は確認モーダルを表示しない（ブロックほど重い操作ではないため）。
解除も即時実行。

## API

### POST /api/mute/toggle

ミュート状態をトグル

**リクエスト**
```json
{ "targetUserId": "xxx" }
```

**レスポンス**
```json
{ "muted": true }
```

### GET /api/mute/status

ミュート状態を取得

**クエリパラメータ**
- `targetUserId`: 対象ユーザーID

**レスポンス**
```json
{ "muted": true }
```

## Firestore Rules

```javascript
// mutedUsers/{mutedId} （ユーザーのミュートリスト）
match /users/{userId}/mutedUsers/{mutedId} {
  // 本人のみ読み書き可能
  allow read: if isUser(userId);
  allow create: if isUser(userId)
    && request.resource.data.keys().hasAll(['id','mutedAt'])
    && request.resource.data.id == mutedId;
  allow delete: if isUser(userId);
  allow update: if false;
}
```

## 実装タスク

### Phase 1: 基盤
- [x] `MutedUserDoc` 型定義追加
- [x] `lib/paths.ts` に `mutedUsers` 追加
- [x] `lib/repos/muteRepo.ts` 作成
  - `muteUser(userId, targetId)`
  - `unmuteUser(userId, targetId)`
  - `toggleMute(userId, targetId)`
  - `isMuting(userId, targetId)`
  - `getMutedUserIds(userId)`
  - `filterOutMuted()` - タイムライン用フィルタ
  - `filterOutMutedComments()` - コメント用フィルタ
- [x] Firestore Rules に mutedUsers ルール追加

### Phase 2: API
- [x] `/api/mute/toggle` 作成
- [x] `/api/mute/status` 作成

### Phase 3: UI
- [x] `MuteButton` コンポーネント作成
- [x] プロフィールページにミュートボタン追加
- [x] ミュート状態の取得処理追加

### Phase 4: フィルタリング
- [x] タイムライン: ミュート中ユーザーのアルバムをフィルタ
- [x] タイムライン: ミュート中ユーザーのコメントをフィルタ
- [x] タイムライン: ミュート中ユーザーの「画像追加しました」をフィルタ
- [x] タイムライン: コメント購読時のミュートフィルタリング
- [x] アルバム詳細: ミュート中ユーザーのコメントをフィルタ
- [ ] 通知: ミュート中ユーザーからの通知をフィルタ

## 将来の拡張（今回は対象外）

- 設定画面でのミュート一覧表示・解除機能
- ミュート期間の設定（24時間、1週間、永久など）
- キーワードミュート

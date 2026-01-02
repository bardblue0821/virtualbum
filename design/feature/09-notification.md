# 通知機能

## 通知種別
- 他ユーザーのコメント
- 他ユーザーのいいね
- 他ユーザーのリポスト
- 他ユーザーの写真追加
- 他ユーザーのフレンド申請
- 他ユーザーのウォッチ登録

## 通知画面
- 発生時刻の新しい順に1列表示
- 未確認の通知は背景を色付け
- 通知画面を開いたら全て既読化
- 本人のみ閲覧可能

## データモデル
```typescript
{
  id: string;
  userId: string;          // 受信者
  type: string;            // 種別
  actorId: string;         // 行為者
  albumId?: string;        // 関連アルバム
  message: string;         // 表示メッセージ
  createdAt: Date;
  readAt: Date | null;
}
```

## ヘッダーバッジ
- 未読件数を表示
- リアルタイム更新

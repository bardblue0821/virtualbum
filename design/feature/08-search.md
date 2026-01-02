# 検索機能

## 検索対象
- ユーザー検索
  - ユーザー名（displayName）
  - ハンドル（@handle）
- アルバム検索
  - アルバム名
  - アルバムの説明
  - コメント

## 検索仕様
- 小文字化して前方一致検索
- デバウンス処理（250ms）
- 各カテゴリ最大20件
- @ から開始した場合は handle 優先

## UI
- 上部に検索窓
- 2カラムレイアウト（ユーザー/アルバム）
- モバイルでは縦積み
- ローディングインジケータ

## データ準備
- displayNameLower, handleLower フィールド
- titleLower, descriptionLower フィールド
- bodyLower フィールド

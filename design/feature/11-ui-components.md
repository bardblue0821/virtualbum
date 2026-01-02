# UI コンポーネント

## ナビゲーション
- サイドナビ（デスクトップ）
  - 左端に常設
  - タイムライン、検索、通知、作成、プロフィール
- ボトムナビ（モバイル）
  - 画面下部に固定
  - 同じ項目を表示

## カラーパレット
- アクセントカラー: CSS変数で統一
- ライトモード/ダークモード対応
- .btn-accent, .link-accent クラス

## テーマ切替
- Mantine ColorScheme 使用
- OS設定に追従
- 手動切替可能

## フォーム
- 下線スタイル
- バリデーション表示
- エラーメッセージ

## モーダル
- Radix UI または shadcn/ui
- アクセシビリティ対応

## アイコン
- lucide-react
- 絵文字（ emoji-mart）

## ライブラリ
- React Hook Form + Zod（フォーム）
- react-dropzone（アップロード）
- sonner（トースト）
- Framer Motion（アニメーション）
- @tanstack/react-query（データ取得）
- @tanstack/react-virtual（バーチャライゼーション）

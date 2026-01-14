1. コンポーネント分割の基本原則
1.1 責任の分離

1ファイル1責任: 各コンポーネントは単一の明確な責任を持つ
50行ルール: コンポーネントが50行を超えたら分割を検討
3階層ルール: ネストが3階層を超えたら子コンポーネントに抽出

1.2 分割の優先順位

UI部品（ボタン、カード、フォーム要素）
セクション単位（ヘッダー、サイドバー、フッター）
ビジネスロジックを含む機能単位

2. ディレクトリ構造
app/
├── (route)/
│   ├── page.tsx           # 最小限のコード（データ取得+レイアウト）
│   ├── _components/       # このページ専用のコンポーネント
│   │   ├── PageHeader.tsx
│   │   ├── MainContent.tsx
│   │   └── PageFooter.tsx
│   └── _lib/              # このページ専用のロジック
│       ├── actions.ts     # Server Actions
│       ├── queries.ts     # データ取得関数
│       └── utils.ts       # ユーティリティ関数
└── _shared/               # 複数ページで共有
    ├── components/
    └── lib/
3. page.tsxの役割
page.tsxは以下のみを含む：

Server Componentとしてのデータ取得
メタデータのエクスポート
レイアウトコンポーネントの組み立て
最上位のエラーハンドリング

typescript// ✅ 良い例
export default async function Page({ params }: Props) {
  const data = await fetchData(params.id);
  
  return (
    <>
      <PageHeader title={data.title} />
      <MainContent data={data} />
      <PageFooter />
    </>
  );
}
4. ロジックの分離パターン
4.1 データ取得

_lib/queries.ts にServer Component用の取得関数を配置
キャッシュ戦略は関数レベルで設定

4.2 Server Actions

_lib/actions.ts に"use server"を付けた関数を配置
フォーム送信、データ変更処理を集約

4.3 クライアントロジック

カスタムフックとして _lib/hooks.ts に抽出
状態管理ロジックを分離

4.4 バリデーション

_lib/validations.ts にZodスキーマを配置
Server ActionsとClient両方で再利用

5. 状態管理の分離
5.1 URL状態

searchParamsで管理（ページネーション、フィルター等）
page.tsx内で直接扱う

5.2 サーバー状態

React QueryやSWRで管理
カスタムフックに抽出

5.3 UI状態

useState/useReducerをカスタムフックに抽出
Context APIは慎重に使用（過度な使用は避ける）

6. コンポーネント命名規則
6.1 プレフィックス

use*: カスタムフック
*Provider: Contextプロバイダー
*Form: フォームコンポーネント
*List: リスト表示コンポーネント
*Card: カード型UI

6.2 サフィックス

*Section: ページのセクション
*Layout: レイアウトコンポーネント
*Modal: モーダルダイアログ

7. 実践的リファクタリング手順

識別: 50行以上のブロックをマーク
抽出: 独立したコンポーネントファイルを作成
props定義: TypeScriptで型を明確に定義
インポート整理: バレルエクスポート（index.ts）の活用
テスト: 動作確認後、元のコードを削除

8. 避けるべきアンチパターン

❌ page.tsx内でのuseState/useEffectの多用
❌ 100行を超えるJSX
❌ インラインでの複雑なロジック
❌ propsのバケツリレー（3階層以上）
❌ _components内のさらなるネスト

9. パフォーマンス考慮事項

Server Component優先: デフォルトはServer Component
"use client"は最小範囲: 必要な部分だけClient Component化
動的インポート: 重いコンポーネントはdynamic()で遅延ロード
React.memo: 適切な箇所でメモ化

10. チェックリスト
リファクタリング後に確認：

 page.tsxは100行以内
 各コンポーネントは50行以内
 propsは5個以内
 ネストは3階層以内
 ビジネスロジックは_lib/に分離
 再利用可能な部品は_shared/に配置
 型定義が明確
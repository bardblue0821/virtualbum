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

---

## 追加: Virtualbum プロジェクト固有の指針

### 11. Firebase統合パターン

11.1 Firestoreクエリの分離
- _lib/queries.ts にFirestoreクエリ関数を集約
- キャッシュ戦略（revalidatePath/revalidateTag）を明示
- 権限チェックは Backend SDK（firebase-admin）で実施

例：
```typescript
// _lib/queries.ts
import { initializeServerSDK } from '@/lib/firebase-admin';

export async function fetchAlbum(id: string) {
  const db = initializeServerSDK();
  const doc = await db.collection('albums').doc(id).get();
  if (!doc.exists) return null;
  return doc.data();
}

// app/album/[id]/page.tsx
export default async function Page({ params }: Props) {
  const album = await fetchAlbum(params.id);
  return <MainContent album={album} />;
}
```

11.2 クライアント側の状態管理
- react-firebase-hooks の useDocument/useCollection を活用
- リアルタイム更新が必要な部分のみClient Component化
- useAuthUser で認証ユーザー情報を取得

例：
```typescript
// "use client"
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';

export function AlbumDetail({ id }: Props) {
  const [value, loading, error] = useDocument(doc(db, 'albums', id));
  if (loading) return <Skeleton />;
  if (error) return <Error />;
  return <Content album={value?.data()} />;
}
```

11.3 認証状態の外部化
- useAuthUser フックをカスタムフック化（既存）
- page.tsx でのonAuthStateChanged不要（useAuthUserで管理）
- 認証が必要なページは AuthGate でラップ

### 12. パフォーマンス最適化（Virtualbum特有）

12.1 画像処理の遅延ロード
- next/image の priority 属性を活用
- 初期表示はサムネイル、クリック時に原寸サイズ
- 無限スクロール時は Intersection Observer との組み合わせ

例：
```typescript
import Image from 'next/image';

export function AlbumCard({ album }: Props) {
  const [isVisible, ref] = useInView({ threshold: 0.1 });
  
  return (
    <div ref={ref}>
      {isVisible && (
        <Image
          src={album.firstImageUrl}
          alt={album.title}
          width={300}
          height={300}
          placeholder="blur"
          blurDataURL={album.thumbDataUrl}
        />
      )}
    </div>
  );
}
```

12.2 無限スクロール実装の最適化
- react-intersection-observer と useInfiniteQuery のペア
- 既読済みアイテムのメモ化
- 同じデータの重複フェッチ防止

例：
```typescript
// _lib/hooks.ts
export function useAlbumList() {
  const [items, setItems] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  
  const loadMore = async () => {
    const newDocs = await fetchAlbums(lastDoc);
    setItems(prev => [...prev, ...newDocs]);
    setLastDoc(newDocs[newDocs.length - 1]);
  };
  
  return { items, loadMore };
}
```

12.3 リアルタイム更新の最適化
- コメント・リアクション追加時は局所的に状態更新
- タイムライン全体の再フェッチは不要
- useCollection の limit() で初期データ制限

### 13. エラーハンドリングの統一

13.1 Firebase固有エラー
- auth/ エラーは mapAuthError で統一メッセージ化（既存）
- permission-denied は403ページへリダイレクト
- not-found は404ページへリダイレクト

13.2 API エラーハンドリング
- _lib/errors.ts に統一エラークラス定義
- Server Actions で catch して適切なレスポンスを返す

例：
```typescript
// _lib/errors.ts
export class FirestoreError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// _lib/actions.ts
export async function submitComment(formData: FormData) {
  'use server';
  try {
    await addComment(...);
    revalidatePath('/timeline');
  } catch (err) {
    if (err instanceof FirestoreError && err.code === 'permission-denied') {
      throw new Error('権限がありません');
    }
    throw err;
  }
}
```

### 14. ページ固有のリファクタリング優先度

**高優先度（性能インパクト大）:**
1. app/timeline/page.tsx (902行)
   - タイムラインフィード → TimelineSection コンポーネント化
   - フィルター UI → FilterBar コンポーネント化
   - アルバムカード列 → AlbumList コンポーネント化

2. app/user/[id]/page.tsx (2080行) ⚠️ 最優先
   - プロフィール情報 → ProfileHeader コンポーネント化
   - タブ切り替え UI → ProfileTabs コンポーネント化
   - 各タブコンテンツ → ProfileContent/* コンポーネント化

3. app/search/page.tsx (453行)
   - 検索結果セクション → SearchResults コンポーネント化
   - 各カテゴリ結果 → SearchCategory* コンポーネント化

**中優先度:**
4. app/album/[id]/page.tsx (463行)
   - アルバムヘッダー → AlbumHeader コンポーネント化（既存）
   - ギャラリー → GallerySection コンポーネント化（既存）
   - コメント → CommentsSection コンポーネント化

### 15. Suspense & Streaming の活用

15.1 重い処理の段階的ロード
```typescript
// page.tsx
export default async function Page() {
  return (
    <>
      <ProfileHeader /> {/* 高速 */}
      <Suspense fallback={<SkeletonCards />}>
        <AlbumsList /> {/* 遅い */}
      </Suspense>
    </>
  );
}
```

15.2 キャッシュ戦略
```typescript
// _lib/queries.ts
export async function fetchAlbums(userId: string) {
  // 1分間キャッシュ
  return getCachedData(
    `albums-${userId}`,
    () => db.collection('albums')
      .where('ownerId', '==', userId)
      .get(),
    { revalidate: 60 }
  );
}
```

### 16. 測定とモニタリング

16.1 Web Vitals の監視
- LCP（Largest Contentful Paint）の削減が優先
- INP（Interaction to Next Paint）の最適化

16.2 リファクタリング前後の比較
```bash
# 前後でビルドサイズを比較
npm run build -- --analyze

# Lighthouse 測定
lighthouse https://local:3000
```

### 17. Virtualbum 専用チェックリスト

リファクタリング完了時の確認：

- [ ] Server Component と Client Component が明確に分離
- [ ] Firestore クエリが _lib/queries.ts に集約
- [ ] 認証・権限チェックが firebase-admin で実施
- [ ] useAuthUser による認証状態取得が統一
- [ ] 無限スクロール実装が最適化（重複フェッチなし）
- [ ] 画像遅延ロードが next/image で実装
- [ ] リアルタイム更新が局所的（全体再フェッチなし）
- [ ] エラーハンドリングが統一
- [ ] Suspense による段階的ロード実装
- [ ] ページ読み込み時間が30%以上削減確認

---

## 18. リファクタリング実施ログ

### 2026-01-14 - Phase 1: プロフィールページUI分離

**実施内容:**

1. **カスタムフック抽出** (`app/user/[id]/_lib/hooks/`)
   - `useProfile.ts` (158行): プロフィールデータ・タグ管理
   - `useSocialActions.ts` (391行): フレンド/ウォッチ/ブロック/ミュート
   - `useProfileTabs.ts` (901行): タブコンテンツ・アルバムアクション
   - `useDeleteAccount.ts` (124行): アカウント削除処理

2. **UIコンポーネント抽出** (`app/user/[id]/_components/`)
   - `ProfileHeader.tsx` (199行): アバター・名前・自己紹介・タグ
   - `ProfileTabs.tsx` (57行): タブナビゲーション
   - `ProfileActions.tsx` (100行): ソーシャルアクションボタン群

3. **共有コンポーネント** (`app/_shared/components/`)
   - `UserListModal.tsx` (85行): Watchers/Friendsリスト表示モーダル

**結果:**
- Before: `page.tsx` 2081行
- After: `page.tsx` 582行 (72%削減)
- 総ファイル数: 9ファイル、合計 2597行

**課題:**
- `useProfileTabs.ts` がまだ901行と大きい → Phase 2で分割検討
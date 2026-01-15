# アルバム詳細ページ (`/app/album/[id]`) リファクタリング規約

## 現状分析: 問題点の特定

### 🔴 Critical Issues (優先度: 高)

#### 1. **グローバルステート汚染**
```typescript
// ❌ BAD: window オブジェクトへの直接的な書き込み
useEffect(() => {
  if (user) {
    (window as any).__getIdToken = () => user.getIdToken();
  }
  return () => {
    delete (window as any).__getIdToken;
  };
}, [user]);
```
**問題**: 
- グローバルスコープを汚染
- 型安全性の欠如
- テストが困難
- 他のコンポーネントとの競合リスク

**解決策**: Context API または props drilling で解決

---

#### 2. **コンポーネント内でのビジネスロジック記述**
```typescript
// ❌ BAD: JSX内で複雑なロジック
{images.length > 0 && (
  (() => {
    const userLatestMap = new Map<string, number>();
    for (const img of images) {
      if (!img.uploaderId) continue;
      const ts = img.createdAt?.seconds ?? img.createdAt ?? 0;
      // ...20行以上のロジック
    }
    return (<section>...</section>);
  })()
)}
```
**問題**:
- JSX が読みにくい
- ロジックの再利用不可
- テスト不可
- パフォーマンス最適化が困難

**解決策**: 専用のコンポーネントまたは useMemo に抽出

---

#### 3. **型安全性の欠如**
```typescript
// ❌ BAD: any 型の多用
album={album as any}
comments={comments as any}
setAlbum((prev: any) => ...)
```
**問題**:
- 型チェックが機能しない
- リファクタリング時のミスを検出できない
- IDE のサポートが効かない

**解決策**: 適切な型定義を作成

---

#### 4. **重複したAPI呼び出しロジック**
```typescript
// ❌ BAD: モーダル内で直接API呼び出し
onDeleteImage={async (imageId: string) => {
  const token = await user!.getIdToken();
  const res = await fetch('/api/images/delete', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ albumId, userId: user!.uid, imageId }),
  });
  // ... エラーハンドリング
}}
```
**問題**:
- 同じロジックが複数箇所に存在
- エラーハンドリングの一貫性がない
- テストが困難

**解決策**: カスタムフックまたはサービス層に抽出

---

### 🟡 Medium Issues (優先度: 中)

#### 5. **計算値の散在**
```typescript
// ❌ BAD: コンポーネント直下で計算
const myCount = images.filter((img) => img.uploaderId === user?.uid).length;
const remaining = 4 - myCount;
const canAddImages = !!user && (isOwner || isFriend);
const canPostComment = !!user && (isOwner || isFriend || (!isPrivate && isWatcher));
```
**問題**:
- 権限計算ロジックが散在
- 再利用不可
- 変更時の影響範囲が不明確

**解決策**: `usePermissions` のような専用フックに集約

---

#### 6. **Props のバケツリレー**
```typescript
// ❌ BAD: 多数の props を個別に渡す
<AlbumHeader
  album={album as any}
  isOwner={isOwner}
  editTitle={editTitle}
  editPlaceUrl={editPlaceUrl}
  savingAlbum={savingAlbum}
  onTitleChange={setEditTitle}
  onPlaceUrlChange={setEditPlaceUrl}
  onTitleBlur={saveTitleIfChanged}
  onPlaceUrlBlur={savePlaceUrlIfChanged}
  onInputKeyDownBlurOnEnter={handleInputKeyDownBlurOnEnter}
  onVisibilityChange={handleChangeVisibility}
  tags={album.tags || []}
  tagCandidates={tagCandidates}
  onTagsChange={handleTagsChange}
/>
```
**問題**:
- 14個の props
- 変更時の影響範囲が大きい
- コンポーネントの責務が不明確

**解決策**: オブジェクトでグループ化、またはContext使用

---

#### 7. **マジックナンバーの使用**
```typescript
// ❌ BAD: ハードコードされた数値
const [visibleCount, setVisibleCount] = useState(16);
onSeeMore={() => setVisibleCount((n) => Math.min(images.length, n + 16))}
const remaining = 4 - myCount;
```
**問題**:
- 意図が不明
- 変更時に複数箇所を修正

**解決策**: 定数化

---

### 🟢 Minor Issues (優先度: 低)

#### 8. **コメントの過剰使用**
```typescript
// ❌ BAD: 自明なコメント
// ========================================
// 分割したフックを使用
// ========================================

// データ取得
const { album, setAlbum, ... } = useAlbumData(...);

// 権限判定
const isOwner = ...;
```
**問題**:
- コードで表現できることをコメントで記述
- メンテナンスコストが2倍

**解決策**: 自己文書化コード（関数名・変数名で意図を表現）

---

## リファクタリング規約

### 1. **ディレクトリ構造**

```
app/album/[id]/
├── page.tsx                      # エントリーポイント（100行以内）
├── _components/                  # ページ専用コンポーネント
│   ├── AlbumPageLayout.tsx       # レイアウト
│   ├── ParticipantsSection.tsx   # 参加者一覧
│   └── AlbumPermissionGuard.tsx  # 権限チェック
├── _lib/
│   ├── hooks/                    # カスタムフック
│   │   ├── index.ts
│   │   ├── useAlbumData.ts
│   │   ├── useAlbumPermissions.ts # 権限計算を集約
│   │   ├── useAlbumActions.ts     # アクション集約
│   │   └── ...
│   ├── services/                 # ビジネスロジック
│   │   ├── imageService.ts       # 画像関連ロジック
│   │   └── participantService.ts # 参加者ロジック
│   ├── types/                    # 型定義
│   │   └── album.types.ts
│   └── constants/                # 定数
│       └── album.constants.ts
└── hooks/ (既存) → _lib/hooks/ に移行
```

---

### 2. **コーディング規約**

#### 2.1 型安全性

```typescript
// ✅ GOOD: 明示的な型定義
interface AlbumDetailProps {
  albumId: string;
}

interface AlbumData {
  id: string;
  ownerId: string;
  title: string | null;
  placeUrl: string | null;
  visibility: 'public' | 'friends';
  tags: string[];
}

// ❌ BAD
const album: any = ...;
```

**ルール**:
- `any` 型は原則禁止（外部ライブラリとの境界のみ許可）
- `as` キャストは最小限に
- すべての関数に戻り値の型を明示

---

#### 2.2 DRY原則

```typescript
// ✅ GOOD: ロジックを抽出
const IMAGE_LIMITS = {
  PER_USER: 4,
  INITIAL_VISIBLE: 16,
  LOAD_MORE_COUNT: 16,
} as const;

function useImageLimits(images: ImageRecord[], userId?: string) {
  const myCount = useMemo(
    () => images.filter((img) => img.uploaderId === userId).length,
    [images, userId]
  );
  
  return {
    myCount,
    remaining: IMAGE_LIMITS.PER_USER - myCount,
    canUploadMore: myCount < IMAGE_LIMITS.PER_USER,
  };
}

// ❌ BAD: 重複したロジック
const myCount = images.filter(...).length;
const remaining = 4 - myCount;
```

**ルール**:
- 同じロジックは3回目で抽出（Rule of Three）
- 定数は constants/ に集約
- ユーティリティ関数は services/ に配置

---

#### 2.3 コメント削減

```typescript
// ✅ GOOD: 関数名で意図を表現
function sortParticipantsByLatestActivity(
  images: ImageRecord[],
  ownerId: string
): string[] {
  const userLatestMap = getUserLatestActivityMap(images);
  return sortWithOwnerFirst(Array.from(userLatestMap.keys()), ownerId, userLatestMap);
}

// ❌ BAD: コメントで説明
// ユーザーごとの最後の投稿日時を取得
const userLatestMap = new Map<string, number>();
for (const img of images) {
  // ...
}
```

**ルール**:
- コメントは「なぜ」を説明（「何を」ではない）
- 複雑なロジックは関数に抽出して名前で説明
- 区切り線コメント（`// ====`）は使用禁止

---

#### 2.4 関数サイズ

```typescript
// ✅ GOOD: 単一責任
function ParticipantsSection({ participants, ownerId, friendIds }: Props) {
  return (
    <section aria-label="参加ユーザー">
      <ParticipantList
        participants={participants}
        ownerId={ownerId}
        friendIds={friendIds}
      />
    </section>
  );
}

// ❌ BAD: JSX内で即時関数
{images.length > 0 && (
  (() => {
    // 20行以上のロジック
    return <section>...</section>;
  })()
)}
```

**ルール**:
- 1関数は最大50行
- JSX内の即時関数は禁止
- 複雑なロジックは useMemo または別コンポーネント

---

#### 2.5 カスタムフック設計

```typescript
// ✅ GOOD: 単一責任の原則
function useAlbumPermissions(
  album: AlbumData | null,
  user: User | null,
  accessInfo: AccessInfo
) {
  return useMemo(() => ({
    isOwner: !!(user && album?.ownerId === user.uid),
    canEdit: !!(user && album?.ownerId === user.uid),
    canView: calculateViewPermission(album, user, accessInfo),
    canComment: calculateCommentPermission(album, user, accessInfo),
    canUpload: calculateUploadPermission(album, user, accessInfo),
  }), [album, user, accessInfo]);
}

// ❌ BAD: 複数の責務を持つフック
function useAlbumStuff() {
  // データ取得、編集、削除、コメント...全部入り
}
```

**ルール**:
- 1フックは1つの責務
- フック名は `use<名詞>` または `use<動詞><名詞>`
- 戻り値は常にオブジェクトでグループ化

---

#### 2.6 Props設計

```typescript
// ✅ GOOD: グループ化されたprops
interface AlbumHeaderProps {
  album: AlbumData;
  permissions: AlbumPermissions;
  editState: EditState;
  onEdit: EditHandlers;
  tags: TagState;
}

// ❌ BAD: フラットなprops
interface AlbumHeaderProps {
  album: any;
  isOwner: boolean;
  editTitle: string;
  editPlaceUrl: string;
  savingAlbum: boolean;
  onTitleChange: (v: string) => void;
  onPlaceUrlChange: (v: string) => void;
  onTitleBlur: () => void;
  onPlaceUrlBlur: () => void;
  // ...さらに10個
}
```

**ルール**:
- 関連するpropsはオブジェクトでグループ化
- propsは最大7個まで
- コールバックは `on<動詞>` 形式

---

#### 2.7 エラーハンドリング

```typescript
// ✅ GOOD: 統一されたエラーハンドリング
async function deleteImage(imageId: string) {
  try {
    await imageService.delete(albumId, imageId, userId);
    // 成功時の処理
  } catch (error) {
    const message = translateError(error);
    toast.error(message);
    logger.error('Image deletion failed', { imageId, error });
  }
}

// ❌ BAD: 個別のエラーハンドリング
try {
  const res = await fetch(...);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'DELETE_FAILED');
  }
} catch { ... }
```

**ルール**:
- API呼び出しは services/ 層に集約
- エラーハンドリングは一貫性を保つ
- エラーログは構造化

---

### 3. **パフォーマンス規約**

```typescript
// ✅ GOOD: useMemo で最適化
const sortedParticipants = useMemo(
  () => sortParticipants(images, album.ownerId),
  [images, album.ownerId]
);

// ✅ GOOD: useCallback で関数を安定化
const handleDelete = useCallback(async (id: string) => {
  await deleteImage(id);
}, [deleteImage]);

// ❌ BAD: 毎レンダリングで新しいオブジェクト
const permissions = {
  canEdit: isOwner,
  canView: !isBlocked,
  // ...
};
```

**ルール**:
- 計算値は useMemo
- コールバックは useCallback
- 依存配列を正確に指定

---

### 4. **テスタビリティ**

```typescript
// ✅ GOOD: テスト可能な設計
export function calculatePermissions(
  album: AlbumData,
  user: User | null,
  access: AccessInfo
): Permissions {
  // Pure function
}

export function useAlbumPermissions(...) {
  return useMemo(() => calculatePermissions(...), [...]);
}

// ❌ BAD: テスト困難
function Component() {
  const canEdit = user && album?.ownerId === user.uid && !isBlocked;
  // ...
}
```

**ルール**:
- ビジネスロジックは純粋関数で実装
- フックは薄いラッパーに
- グローバルステート依存を最小化

---

## リファクタリング手順

### Phase 1: 基盤整備（Week 1）
1. ✅ ディレクトリ構造作成
2. ✅ 型定義の整理 (`_lib/types/`)
3. ✅ 定数の抽出 (`_lib/constants/`)
4. ✅ ビジネスロジックの抽出 (`_lib/services/`)

### Phase 2: コンポーネント分割（Week 2）
1. ✅ ParticipantsSection の抽出
2. ✅ AlbumPermissionGuard の作成
3. ✅ ページレイアウトの整理

### Phase 3: フックの整理（Week 3）
1. ✅ useAlbumPermissions の作成
2. ✅ 既存フックのリファクタリング
3. ✅ グローバルステート汚染の除去

### Phase 4: 最適化とクリーンアップ（Week 4）
1. ✅ パフォーマンス最適化
2. ✅ 不要なコメント削除
3. ✅ 型安全性の向上
4. ✅ テスト追加

---

## チェックリスト

### コードレビュー時の確認項目

- [ ] `any` 型を使用していないか
- [ ] JSX内に複雑なロジックがないか
- [ ] グローバルステートを汚染していないか
- [ ] 同じロジックが3回以上出現していないか
- [ ] 関数が50行を超えていないか
- [ ] propsが7個を超えていないか
- [ ] コメントは「なぜ」を説明しているか
- [ ] useMemo/useCallback を適切に使用しているか
- [ ] エラーハンドリングは一貫性があるか
- [ ] マジックナンバーは定数化されているか

---

## 参考資料

- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [React Hooks Best Practices](https://react.dev/learn)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)

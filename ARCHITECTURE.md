# VirtualBum - アーキテクチャドキュメント

_Last Updated: 2026-01-16_

---

## 📋 **概要**

VirtualBum はNext.js 16.1.0 (Turbopack) で構築された、ソーシャル写真共有アプリケーションです。
アルバムを作成・共有し、友人とコラボレートするプラットフォームです。

**主な技術スタック:**
- Framework: Next.js 16.1.0 (App Router)
- Language: TypeScript (strict mode)
- UI: React + Custom CSS
- Database: Cloud Firestore
- Authentication: Firebase Auth + Twitter OAuth
- Storage: Firebase Storage

---

## 🏗️ **ディレクトリ構成**

```
virtualbum/
├── app/                              # Next.js App Router
│   ├── album/
│   │   ├── [id]/                     # アルバム詳細ページ（動的ルート）
│   │   │   ├── page.tsx              # ページコンポーネント (283 lines)
│   │   │   ├── _components/          # ページ専用コンポーネント (9個)
│   │   │   │   ├── AlbumHeader.tsx
│   │   │   │   ├── AlbumPermissionGuard.tsx
│   │   │   │   ├── CommentsSection.tsx
│   │   │   │   ├── GallerySection.tsx
│   │   │   │   ├── ImageManageModal.tsx
│   │   │   │   ├── ParticipantsSection.tsx
│   │   │   │   ├── ReactionPicker.tsx
│   │   │   │   ├── ReactionsBar.tsx
│   │   │   │   └── ReactorPopover.tsx
│   │   │   └── _lib/                 # ページ専用ロジック
│   │   │       ├── hooks/            # 13 個のカスタムフック
│   │   │       │   ├── useAlbumData.ts
│   │   │       │   ├── useAlbumEdit.ts
│   │   │       │   ├── useAlbumPermissions.ts
│   │   │       │   ├── useAlbumTags.ts
│   │   │       │   ├── useComments.ts
│   │   │       │   ├── useGalleryPermissions.ts
│   │   │       │   ├── useGalleryPhotos.ts
│   │   │       │   ├── useImageActions.ts
│   │   │       │   ├── useImageManagement.ts
│   │   │       │   ├── useLikes.ts
│   │   │       │   ├── useMyFriends.ts
│   │   │       │   ├── useReactions.ts
│   │   │       │   ├── useVisibleCount.ts
│   │   │       │   └── index.ts      # Barrel export
│   │   │       ├── types/
│   │   │       │   └── album.types.ts
│   │   │       ├── constants/
│   │   │       │   └── album.constants.ts
│   │   │       └── services/
│   │   │           ├── imageService.ts
│   │   │           └── participantService.ts
│   │   └── new/                      # アルバム作成ページ
│   │       └── page.tsx
│   ├── api/                          # API Routes
│   │   ├── auth/
│   │   ├── block/
│   │   ├── comments/
│   │   ├── images/
│   │   ├── likes/
│   │   ├── mute/
│   │   ├── reactions/
│   │   ├── reports/
│   │   ├── reposts/
│   │   └── share/
│   ├── legal/                        # 静的ページ
│   ├── notification/
│   ├── search/
│   ├── settings/
│   ├── timeline/
│   ├── user/
│   ├── login/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/                       # 共有コンポーネント
│   ├── album/                        # 共有アルバムコンポーネント (4個)
│   │   ├── AlbumActionsMenu.tsx      # タイムラインでも使用
│   │   ├── DeleteConfirmModal.tsx    # 共有モーダル
│   │   ├── ReportConfirmModal.tsx
│   │   └── ShareMenu.tsx             # タイムラインでも使用
│   ├── common/
│   ├── comments/
│   ├── form/
│   ├── gallery/
│   ├── icons/
│   ├── profile/
│   ├── search/
│   ├── timeline/
│   ├── ui/                           # UI プリミティブ
│   ├── upload/
│   ├── user/
│   ├── AlbumCard.tsx
│   ├── AlbumCreateModal.tsx
│   ├── AuthForm.tsx
│   ├── AuthGate.tsx
│   ├── AppFooter.tsx
│   ├── Header.tsx
│   ├── MobileTopNav.tsx
│   ├── SideNav.tsx
│   └── ThemeSwitch.tsx
│
├── lib/                              # 共有ライブラリ
│   ├── auth/
│   │   ├── ensureUser.ts
│   │   └── twitterAuth.ts
│   ├── constants/
│   │   ├── reactions.ts
│   │   └── userFilters.ts
│   ├── errors/
│   │   ├── ErrorHandler.ts
│   │   └── index.ts
│   ├── repos/                        # Firestore リポジトリ層
│   │   ├── albumRepo.ts
│   │   ├── blockRepo.ts
│   │   ├── commentRepo.ts
│   │   ├── friendRepo.ts
│   │   ├── imageRepo.ts
│   │   ├── likeRepo.ts
│   │   ├── muteRepo.ts
│   │   ├── notificationRepo.ts
│   │   ├── reactionRepo.ts
│   │   ├── repostRepo.ts
│   │   ├── searchRepo.ts
│   │   ├── tagRepo.ts
│   │   ├── timelineRepo.ts
│   │   ├── userRepo.ts
│   │   └── watchRepo.ts
│   ├── utils/
│   │   ├── batchQuery.ts
│   │   ├── handleGenerator.ts
│   │   ├── imageCompressor.ts
│   │   ├── imageUrl.ts
│   │   └── rateLimit.ts
│   ├── firebase.ts                   # Firebase 初期化
│   ├── authUser.ts
│   ├── logger.ts
│   ├── paths.ts
│   └── rateLimit.ts
│
├── src/                              # レガシー構成（段階的廃止中）
│   ├── hooks/                        # グローバルフック
│   │   ├── useAlbumAccess.ts
│   │   ├── useAlbumDetail.ts
│   │   ├── useAsyncOperation.ts
│   │   ├── useAuthUser.ts            # 重要: 認証ユーザー情報
│   │   ├── useFriendship.ts
│   │   ├── useNotificationsBadge.ts
│   │   ├── useThumbBackfill.ts
│   │   ├── useTimelineItemVisibility.ts
│   │   ├── useVerificationGuard.ts
│   │   └── useWatch.ts
│   ├── libs/
│   │   └── firebaseAdmin.ts          # Admin SDK
│   ├── models/
│   │   ├── album.ts
│   │   └── timeline.ts
│   ├── repositories/
│   │   └── admin/
│   │       └── firestore.ts
│   └── services/
│       ├── album/
│       │   └── getAlbumDetail.ts
│       ├── avatar.ts
│       ├── createAlbumWithImages.ts
│       ├── deleteAccount.ts
│       ├── profile/
│       │   └── buildPatch.ts
│       └── ... (others)
│
├── hooks/                            # グローバルフック（古い場所）
├── types/                            # グローバル型定義
├── functions/                        # Firebase Cloud Functions
├── test/                             # テストファイル
└── design/                           # アーキテクチャドキュメント
```

---

## 🔗 **依存関係フロー**

### **レイヤー構成**

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (React)                         │
│  app/album/[id]/page.tsx + _components/* (9 components)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────────────────┐  ┌───▼──────────────────────────┐
│  Page-Specific Logic       │  │  Global Components           │
│  (app/album/[id]/_lib/)   │  │  (components/*)              │
│                            │  │                              │
│ • Hooks (13個)            │  │ • AlbumCard                  │
│ • Types (album.types.ts)  │  │ • AuthForm                   │
│ • Constants               │  │ • Gallery                    │
│ • Services                │  │ • Comments                   │
└───────┬────────────────────┘  │ • Profile                    │
        │                        │ • Timeline                   │
        │                        │ • UI (Button, Modal, etc.)   │
        │                        └───────┬──────────────────────┘
        │                                │
        ├────────────────────────────────┤
        │                                │
┌───────▼────────────────────────────────▼──────────────────────┐
│              Repository Layer (lib/repos/*)                   │
│  - albumRepo.ts, commentRepo.ts, likeRepo.ts                │
│  - imageRepo.ts, reactionRepo.ts, etc. (16個)               │
│  → Direct Firestore interaction                             │
└───────┬────────────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────────┐
│           Firebase Services                                  │
│  • Firestore Database                                        │
│  • Firebase Auth                                             │
│  • Firebase Storage                                          │
│  • Cloud Functions                                           │
└────────────────────────────────────────────────────────────────┘
```

### **コンポーネント依存フロー**

#### **album/[id] ページコンポーネント**

```
page.tsx (283 lines)
├── useAlbumData()              # Album, Images, Comments, Reactions
├── useAlbumPermissions()       # Access control
├── useImageActions()           # Upload/Delete
├── useImageManagement()        # Modal management
├── useLikes()                  # Like state
├── useReactions()              # Emoji reactions
├── useComments()               # Comments management
├── useAlbumEdit()              # Title/URL/Visibility edit
├── useAlbumTags()              # Tags management
├── useGalleryPhotos()          # Photo formatting
├── useMyFriends()              # Friend list
├── useVisibleCount()           # Pagination
└── <AlbumPermissionGuard />
    └── <GallerySection />
        ├── <CommentsSection />
        │   └── {CommentList, CommentForm}
        ├── <ReactionsBar />
        │   ├── <ReactionPicker />
        │   └── <ReactorPopover />
        ├── <ImageManageModal />
        ├── <ParticipantsSection />
        └── <AlbumHeader />
```

#### **共有コンポーネント**

```
Timeline Page
├── <TimelineItem />
│   ├── <AlbumActionsMenu />    ← 共有 (app/album/[id] でも可能)
│   ├── <ShareMenu />           ← 共有 (app/album/[id] でも可能)
│   └── <DeleteConfirmModal />  ← 共有

Album Detail Page
├── <AlbumHeader />             ← ページ専用
├── <GallerySection />          ← ページ専用
└── <DeleteConfirmModal />      ← 共有 (timeline でも使用)
```

---

## 📊 **主要コンポーネント・フック統計**

### **ページ専用フック (app/album/[id]/_lib/hooks/)**

| フック | 行数 | 責務 | 状態 |
|-------|------|------|------|
| `useAlbumData.ts` | 216 | Album, Images, Comments, Reactions のフェッチ | ✅ 完成 |
| `useAlbumEdit.ts` | 175 | Title, PlaceUrl, Visibility の編集 | ✅ 完成 |
| `useAlbumPermissions.ts` | 41 | アクセス権限判定 | ✅ 完成 |
| `useImageActions.ts` | 256 | 画像アップロード/削除 | ✅ 完成 |
| `useImageManagement.ts` | 83 | 画像管理モーダル | ✅ 完成 |
| `useLikes.ts` | 125 | Like 状態管理 | ✅ 完成 |
| `useReactions.ts` | 185 | Emoji リアクション | ✅ 最適化完了 |
| `useComments.ts` | - | コメント管理 | 🟢 実装 |
| `useAlbumTags.ts` | - | タグ管理 | 🟢 実装 |
| `useGalleryPhotos.ts` | 31 | 画像フォーマット | ✅ 完成 |
| `useGalleryPermissions.ts` | - | ギャラリー権限 | 🟢 実装 |
| `useMyFriends.ts` | - | 友人リスト | 🟢 実装 |
| `useVisibleCount.ts` | - | ページネーション | 🟢 実装 |

**合計: 13 フック, ~1,112 行以上**

### **ページ専用コンポーネント (app/album/[id]/_components/)**

| コンポーネント | 行数 | 責備 |
|-------------|------|------|
| `AlbumHeader.tsx` | 317 | アルバムタイトル/URL/タグ表示・編集 |
| `AlbumPermissionGuard.tsx` | 62 | 権限ベースのレンダリング制御 |
| `CommentsSection.tsx` | 55 | コメント表示・入力 |
| `GallerySection.tsx` | 204 | lightGallery 統合 |
| `ImageManageModal.tsx` | 527 | 画像アップロード/削除UI |
| `ParticipantsSection.tsx` | 89 | 参加者一覧表示 |
| `ReactionPicker.tsx` | - | Emoji ピッカー |
| `ReactionsBar.tsx` | 103 | Like + Emoji リアクション表示 |
| `ReactorPopover.tsx` | 42 | リアクション者情報 |

**合計: 9 コンポーネント, ~1,399 行以上**

### **共有コンポーネント (components/)**

**Album-specific (4個):**
- `AlbumActionsMenu.tsx` - Timeline + Album detail で使用
- `DeleteConfirmModal.tsx` - 複数ページで使用
- `ReportConfirmModal.tsx` - Timeline で使用
- `ShareMenu.tsx` - Timeline + Album detail で使用

**Global UI (41個):**
- Comments (2), Gallery, Icons (8), Profile (6), Timeline (5), Form (4), Search (1), Upload (2), User (3)

---

## 🔄 **データフロー**

### **アルバム詳細ページの初期化フロー**

```
1. page.tsx マウント
   ↓
2. useAlbumData フック
   ├── getAlbumDetailVM() → Firestore から album データ
   ├── subscribeComments() → リアルタイム購読
   ├── batchGetUsers() → Uploader 情報
   └── getMutedUserIds() → ミュート確認
   ↓
3. useAlbumPermissions フック
   ├── Album owner チェック
   ├── Friend status チェック
   ├── Watcher status チェック
   └── Access control 判定
   ↓
4. useImageActions フック
   └── Upload handler セットアップ
   ↓
5. useLikes フック
   ├── countLikes()
   ├── hasLiked()
   └── subscribeLikes() → リアルタイム
   ↓
6. useReactions フック
   └── listReactorsByAlbumEmoji() → リアクター情報
   ↓
7. <AlbumPermissionGuard /> レンダリング
   └── 権限チェック → 404 or コンテンツ表示
```

### **画像アップロードフロー**

```
ユーザー: 画像選択
   ↓
ImageManageModal.tsx
   ├── getCroppedBlobSized() → 圧縮
   └── Firebase Storage へアップロード
   ↓
API: /api/images/add
   ├── Firestore に Image レコード作成
   └── 通知作成
   ↓
useImageActions.ts
   ├── optimistic update
   └── useImageManagement で UI 更新
   ↓
useAlbumData.ts
   └── リアルタイム購読で同期
```

---

## 🎯 **型システム**

### **主要型定義**

**app/album/[id]/_lib/types/album.types.ts:**
```typescript
export type ImageRecord = {
  id: string;
  albumId: string;
  uploaderId: string;
  url: string;
  thumbUrl?: string;
  createdAt?: any;
  [key: string]: any;
};

export interface AlbumData { /* ... */ }
export interface CommentData { /* ... */ }
// ... その他
```

**src/models/album.ts:**
```typescript
export interface UserRef { /* ... */ }
export interface AlbumDetail { /* ... */ }
```

---

## 🗂️ **責任分離**

### **関心の分離**

| 層 | 責務 | 例 |
|----|------|-----|
| **UI Components** | レンダリング・イベントハンドリング | `<AlbumHeader />`, `<CommentsSection />` |
| **Custom Hooks** | ビジネスロジック・状態管理 | `useAlbumData`, `useImageActions` |
| **Repository Layer** | Firestore CRUD操作 | `albumRepo.ts`, `commentRepo.ts` |
| **Services** | ビジネスロジック | `imageService.ts`, `participantService.ts` |
| **Utilities** | 共有関数 | `imageCompressor.ts`, `batchQuery.ts` |

### **ページ専用 vs グローバル**

**ページ専用 (app/album/[id]/_lib/, _components/):**
- アルバム詳細ページに特化したロジック
- 再利用性が低い
- ページのコンテキストに依存

**グローバル (components/, lib/, src/):**
- 複数ページで使用可能
- 汎用的なコンポーネント・ロジック
- 共有される機能

---

## 📈 **規模指標**

| 項目 | 数量 |
|------|------|
| **Pages** | 11+ |
| **API Routes** | 14+ |
| **Components** (共有) | 45+ |
| **Components** (ページ専用) | 9 |
| **Custom Hooks** (ページ専用) | 13 |
| **Custom Hooks** (グローバル) | 10 |
| **Repository Functions** | 60+ (16 ファイル) |
| **Total Lines** | ~3,000+ (page + hooks + components) |

---

## ✅ **最近の改善**

### **Phase 1-4 (Session 1-2)**
- ✅ 4 つのバグ修正
- ✅ TagList コンポーネント作成
- ✅ globals.css リファクタリング
- ✅ Album detail page: 464 → 283 行 (-38.8%)

### **Phase 5 (Session 3)**
- ✅ Hook 型安全性: 6/7 完成
- ✅ useLikes.ts: `any` 削除
- ✅ Window 汚染削除
- ✅ 依存配列最適化

### **Phase 6 (Session 4)**
- ✅ ImageData → ImageRecord 統一
- ✅ useReactions.ts: useEffect 最適化 (2→1)
- ✅ ディレクトリ構成最適化: 7 コンポーネント移動
- ✅ components/album: 11 → 4 (重複削除)

---

## 🎓 **アーキテクチャの特徴**

### **✅ 良い点**

1. **明確な責任分離** - UI / Logic / Data層が分離
2. **Barrel Export** - `_lib/hooks/index.ts` で一元管理
3. **Type Safety** - `ImageRecord` 型統一
4. **Colocalization** - ページ専用ロジックは `_lib`, `_components` に集約
5. **再利用可能性** - 共有コンポーネント・フックが明確に分離

### **🟡 改善余地**

1. **Firestore 層** - リポジトリ関数の型安全性向上
2. **エラーハンドリ** - 統一的なエラー処理スキーム
3. **レガシーコード** - `src/` フォルダのコード移行
4. **テスト** - ユニットテスト・E2E テストの追加

---

## 🚀 **推奨される今後の改善**

1. **Firestore リポジトリ型安全化** - 全 repo 関数に型付け
2. **エラーハウンダリー** - React ErrorBoundary の統合
3. **性能最適化** - Firestore クエリ最適化
4. **テスト体制** - Jest + React Testing Library
5. **ドキュメント整備** - Storybook の導入

---

**文末**

このアーキテクチャは、Next.js App Router のベストプラクティスに従い、
スケーラブルで保守性の高い構造を実現しています。


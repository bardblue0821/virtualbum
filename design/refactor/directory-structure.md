# Virtualbum ディレクトリ構成

最終更新: 2026-01-16

## 概要

このドキュメントは、Virtualbum プロジェクトのディレクトリ構成を説明します。
Next.js App Router のルートグループとコロケーションパターンを採用しています。

---

## ルートレベル構成

```
virtualbum/
├── app/                      # Next.js App Router
├── components/               # 共有UIコンポーネント
├── lib/                      # ビジネスロジック・ユーティリティ
├── design/                   # 設計ドキュメント
├── public/                   # 静的ファイル
├── functions/                # Firebase Cloud Functions
└── test/                     # テストファイル
```

---

## app/ ディレクトリ構成

### ルートグループ分類

Next.js のルートグループ機能を使用して、レイアウトとナビゲーションを分離しています。

```
app/
├── layout.tsx                          # ルートレイアウト (Providers のみ)
├── providers.tsx                       # クライアント側プロバイダー
├── globals.css                         # グローバルスタイル
│
├── (guest)/                            # ゲスト向けページグループ
│   ├── layout.tsx                      # Header + Footer レイアウト
│   └── page.tsx                        # ルート "/" (ランディング + 認証)
│
├── (auth)/                             # 認証関連ページグループ
│   ├── layout.tsx                      # 最小限レイアウト
│   ├── login/
│   │   └── page.tsx                    # ログインページ
│   ├── register/
│   │   └── complete/
│   │       └── page.tsx                # 登録完了ページ
│   └── settings/
│       ├── forgot-password/
│       │   └── page.tsx                # パスワード忘れ
│       ├── password/
│       │   └── page.tsx                # パスワード変更
│       └── reset-password/
│           └── page.tsx                # パスワードリセット
│
├── (main)/                             # 認証済みユーザー向けページグループ
│   ├── layout.tsx                      # SideNav + MobileTopNav レイアウト
│   │
│   ├── timeline/                       # タイムラインページ
│   │   ├── page.tsx
│   │   ├── _components/                # ページ専用コンポーネント
│   │   │   ├── index.ts
│   │   │   └── TimelineFilters.tsx
│   │   └── _lib/                       # ページ専用ロジック
│   │       └── hooks/
│   │           ├── index.ts
│   │           ├── useTimelineActions.ts
│   │           ├── useTimelineFeed.ts
│   │           ├── useTimelineFilters.ts
│   │           └── useTimelineModals.ts
│   │
│   ├── album/                          # アルバム関連ページ
│   │   ├── new/
│   │   │   └── page.tsx                # アルバム作成
│   │   └── [id]/                       # アルバム詳細 (動的ルート)
│   │       ├── page.tsx
│   │       ├── _components/            # ページ専用コンポーネント
│   │       │   ├── AlbumHeader.tsx
│   │       │   ├── AlbumPermissionGuard.tsx
│   │       │   ├── CommentsSection.tsx
│   │       │   ├── GallerySection.tsx
│   │       │   ├── ImageManageModal.tsx
│   │       │   ├── ParticipantsSection.tsx
│   │       │   ├── ReactionPicker.tsx
│   │       │   ├── ReactionsBar.tsx
│   │       │   └── ReactorPopover.tsx
│   │       └── _lib/                   # ページ専用ロジック
│   │           ├── constants/
│   │           │   └── album.constants.ts
│   │           ├── hooks/
│   │           │   ├── index.ts
│   │           │   ├── useAlbumData.ts
│   │           │   ├── useAlbumEdit.ts
│   │           │   ├── useAlbumPermissions.ts
│   │           │   ├── useAlbumTags.ts
│   │           │   ├── useComments.ts
│   │           │   ├── useGalleryPermissions.ts
│   │           │   ├── useGalleryPhotos.ts
│   │           │   ├── useImageActions.ts
│   │           │   ├── useImageManagement.ts
│   │           │   ├── useLikes.ts
│   │           │   ├── useMyFriends.ts
│   │           │   ├── useReactions.ts
│   │           │   └── useVisibleCount.ts
│   │           ├── services/
│   │           │   ├── imageService.ts
│   │           │   └── participantService.ts
│   │           └── types/
│   │               └── album.types.ts
│   │
│   ├── user/                           # ユーザープロフィール
│   │   └── [id]/                       # 動的ルート (handle)
│   │       ├── page.tsx
│   │       └── hooks/
│   │           ├── index.ts
│   │           └── useProfileData.ts
│   │
│   ├── search/                         # 検索ページ
│   │   └── page.tsx
│   │
│   └── notification/                   # 通知ページ
│       └── page.tsx
│
├── legal/                              # 法務ページ (括弧なし)
│   ├── layout.tsx                      # Header + Footer レイアウト
│   ├── faq/
│   │   └── page.tsx                    # FAQ (/legal/faq)
│   ├── privacy-policy/
│   │   └── page.tsx                    # プライバシーポリシー
│   └── termsofservice/
│       └── page.tsx                    # 利用規約
│
├── api/                                # API ルートハンドラー
│   ├── auth/
│   │   └── password-reset/
│   │       └── route.ts
│   ├── block/
│   │   ├── status/route.ts
│   │   └── toggle/route.ts
│   ├── comments/
│   │   └── add/route.ts
│   ├── images/
│   │   ├── add/route.ts
│   │   ├── delete/route.ts
│   │   └── register/route.ts
│   ├── likes/
│   │   └── toggle/route.ts
│   ├── mute/
│   │   ├── status/route.ts
│   │   └── toggle/route.ts
│   ├── reactions/
│   │   └── toggle/route.ts
│   ├── reports/
│   │   └── album/route.ts
│   ├── reposts/
│   │   └── toggle/route.ts
│   └── share/
│       └── discord/route.ts
│
└── _shared/                            # アプリケーション横断共有
    └── components/                     # 共有コンポーネント
```

---

## components/ ディレクトリ構成

```
components/
├── common/                             # 汎用コンポーネント
│   ├── AlbumCard.tsx
│   ├── Avatar.tsx
│   ├── ConfirmDialog.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBoundary.tsx
│   ├── ImageContainer.tsx
│   ├── ImagePreview.tsx
│   ├── LoadingSpinner.tsx
│   ├── Skeleton.tsx
│   ├── TimeDisplay.tsx
│   └── UserLink.tsx
│
├── features/                           # 機能別コンポーネント
│   ├── album/
│   │   ├── AlbumAccess.tsx
│   │   ├── AlbumDescription.tsx
│   │   ├── AlbumForm.tsx
│   │   ├── AlbumList.tsx
│   │   ├── AlbumParticipants.tsx
│   │   ├── AlbumThumbnail.tsx
│   │   ├── EmojiMenu.tsx
│   │   └── VisibilitySelector.tsx
│   │
│   ├── auth/
│   │   ├── AuthForm.tsx
│   │   ├── AuthGate.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── LoginForm.tsx
│   │   ├── RegistrationComplete.tsx
│   │   └── ResetPasswordForm.tsx
│   │
│   ├── comments/
│   │   ├── Comment.tsx
│   │   └── CommentForm.tsx
│   │
│   ├── profile/
│   │   ├── BlockButton.tsx
│   │   ├── FollowButton.tsx
│   │   ├── FriendButton.tsx
│   │   ├── MuteButton.tsx
│   │   ├── ProfileAlbums.tsx
│   │   ├── ProfileCard.tsx
│   │   ├── ProfileHeader.tsx
│   │   └── WatchButton.tsx
│   │
│   ├── search/
│   │   ├── SearchAlbumList.tsx
│   │   ├── SearchBar.tsx
│   │   ├── SearchFilters.tsx
│   │   └── SearchUserList.tsx
│   │
│   ├── timeline/
│   │   ├── AlbumCard.tsx
│   │   ├── AlbumGrid.tsx
│   │   ├── TimelineCard.tsx
│   │   └── TimelineFilters.tsx
│   │
│   ├── upload/
│   │   ├── ImageUploadButton.tsx
│   │   ├── MultiImageUpload.tsx
│   │   └── UploadProgress.tsx
│   │
│   └── user/
│       ├── UserAlbums.tsx
│       ├── UserCard.tsx
│       └── UserList.tsx
│
├── form/                               # フォーム関連
│   ├── FileInput.tsx
│   ├── FormError.tsx
│   ├── Input.tsx
│   ├── Label.tsx
│   ├── Select.tsx
│   └── TextArea.tsx
│
├── gallery/                            # ギャラリー機能
│   ├── GalleryControls.tsx
│   ├── GalleryImage.tsx
│   ├── ImageGallery.tsx
│   └── Lightbox.tsx
│
├── icons/                              # アイコンコンポーネント
│   └── (各種アイコン)
│
├── layout/                             # レイアウトコンポーネント
│   ├── AppFooter.tsx                   # フッター (legal/guestで使用)
│   ├── ConditionalSideNav.tsx          # 条件付きサイドナビ
│   ├── Header.tsx                      # ヘッダー (legal/guestで使用)
│   ├── MobileTopNav.tsx                # モバイル下部ナビ (mainで使用)
│   └── SideNav.tsx                     # デスクトップサイドナビ (mainで使用)
│
└── ui/                                 # 基本UIコンポーネント
    ├── Button.tsx
    ├── Card.tsx
    ├── Dialog.tsx
    ├── Dropdown.tsx
    ├── MenuButton.tsx
    ├── Modal.tsx
    ├── Popover.tsx
    ├── Tabs.tsx
    └── Toast.tsx
```

---

## lib/ ディレクトリ構成

```
lib/
├── auth/                               # 認証関連
│   └── withAdminAuth.ts
│
├── constants/                          # 定数定義
│   ├── errorMessages.ts
│   └── validation.ts
│
├── db/                                 # データベースアクセス
│   └── repositories/                   # リポジトリパターン
│       ├── album.repository.ts
│       ├── block.repository.ts
│       ├── comment.repository.ts
│       ├── friend.repository.ts
│       ├── image.repository.ts
│       ├── like.repository.ts
│       ├── mute.repository.ts
│       ├── notification.repository.ts
│       ├── reaction.repository.ts
│       ├── report.repository.ts
│       ├── repost.repository.ts
│       ├── timeline.repository.ts
│       ├── user.repository.ts
│       ├── userAlbum.repository.ts
│       └── watch.repository.ts
│
├── errors/                             # エラーハンドリング
│   └── AppError.ts
│
├── firebase/                           # Firebase 設定
│   ├── admin.ts
│   └── config.ts
│
├── hooks/                              # カスタムフック
│   ├── useAlbumNotifications.ts
│   ├── useAuthUser.ts
│   ├── useBlockStatus.ts
│   ├── useCommentActions.ts
│   ├── useImageDelete.ts
│   ├── useMuteStatus.ts
│   ├── useNotificationsBadge.ts
│   ├── useTagNotifications.ts
│   └── useThumbBackfill.ts
│
├── services/                           # ビジネスロジック
│   ├── album/
│   │   ├── albumService.ts
│   │   └── albumValidation.ts
│   │
│   ├── auth/
│   │   └── authService.ts
│   │
│   ├── image/
│   │   ├── imageOptimization.ts
│   │   ├── imageService.ts
│   │   ├── imageUpload.ts
│   │   └── thumbnailService.ts
│   │
│   ├── profile/
│   │   └── profileService.ts
│   │
│   ├── timeline/
│   │   └── timelineService.ts
│   │
│   └── user/
│       ├── userRelationService.ts
│       └── userService.ts
│
├── types/                              # 型定義
│   ├── album.ts
│   ├── firestore.ts
│   └── timeline.ts
│
├── utils/                              # ユーティリティ
│   ├── dateUtils.ts
│   ├── fileUtils.ts
│   └── stringUtils.ts
│
├── authUser.ts                         # 認証ユーザーユーティリティ
├── firebase.ts                         # Firebase インスタンス
├── logger.ts                           # ロガー
├── paths.ts                            # パス定義
└── rateLimit.ts                        # レート制限
```

---

## ルーティングマップ

### パブリックルート (認証不要)

| ルート                      | ファイルパス                               | レイアウト    | 用途                  |
| --------------------------- | ------------------------------------------ | ------------- | --------------------- |
| `/`                         | `app/(guest)/page.tsx`                     | guest         | ランディング + 認証   |
| `/legal/faq`                | `app/legal/faq/page.tsx`                   | legal         | FAQ                   |
| `/legal/privacy-policy`     | `app/legal/privacy-policy/page.tsx`        | legal         | プライバシーポリシー  |
| `/legal/termsofservice`     | `app/legal/termsofservice/page.tsx`        | legal         | 利用規約              |

### 認証関連ルート

| ルート                          | ファイルパス                                          | レイアウト | 用途                     |
| ------------------------------- | ----------------------------------------------------- | ---------- | ------------------------ |
| `/login`                        | `app/(auth)/login/page.tsx`                           | auth       | ログイン                 |
| `/register/complete`            | `app/(auth)/register/complete/page.tsx`               | auth       | 登録完了                 |
| `/settings/forgot-password`     | `app/(auth)/settings/forgot-password/page.tsx`        | auth       | パスワード忘れ           |
| `/settings/password`            | `app/(auth)/settings/password/page.tsx`               | auth       | パスワード変更           |
| `/settings/reset-password`      | `app/(auth)/settings/reset-password/page.tsx`         | auth       | パスワードリセット       |

### 認証必須ルート

| ルート                  | ファイルパス                           | レイアウト | 用途                 |
| ----------------------- | -------------------------------------- | ---------- | -------------------- |
| `/timeline`             | `app/(main)/timeline/page.tsx`         | main       | タイムライン         |
| `/album/new`            | `app/(main)/album/new/page.tsx`        | main       | アルバム作成         |
| `/album/[id]`           | `app/(main)/album/[id]/page.tsx`       | main       | アルバム詳細         |
| `/user/[id]`            | `app/(main)/user/[id]/page.tsx`        | main       | ユーザープロフィール |
| `/search`               | `app/(main)/search/page.tsx`           | main       | 検索                 |
| `/notification`         | `app/(main)/notification/page.tsx`     | main       | 通知                 |

### API ルート

| ルート                          | ファイルパス                                  | 用途                       |
| ------------------------------- | --------------------------------------------- | -------------------------- |
| `/api/auth/password-reset`      | `app/api/auth/password-reset/route.ts`        | パスワードリセット         |
| `/api/block/status`             | `app/api/block/status/route.ts`               | ブロック状態確認           |
| `/api/block/toggle`             | `app/api/block/toggle/route.ts`               | ブロック切り替え           |
| `/api/comments/add`             | `app/api/comments/add/route.ts`               | コメント追加               |
| `/api/images/add`               | `app/api/images/add/route.ts`                 | 画像追加                   |
| `/api/images/delete`            | `app/api/images/delete/route.ts`              | 画像削除                   |
| `/api/images/register`          | `app/api/images/register/route.ts`            | 画像登録                   |
| `/api/likes/toggle`             | `app/api/likes/toggle/route.ts`               | いいね切り替え             |
| `/api/mute/status`              | `app/api/mute/status/route.ts`                | ミュート状態確認           |
| `/api/mute/toggle`              | `app/api/mute/toggle/route.ts`                | ミュート切り替え           |
| `/api/reactions/toggle`         | `app/api/reactions/toggle/route.ts`           | リアクション切り替え       |
| `/api/reports/album`            | `app/api/reports/album/route.ts`              | アルバム通報               |
| `/api/reposts/toggle`           | `app/api/reposts/toggle/route.ts`             | リポスト切り替え           |
| `/api/share/discord`            | `app/api/share/discord/route.ts`              | Discord共有                |

---

## レイアウト戦略

### 1. ルートレイアウト (`app/layout.tsx`)
- **役割**: アプリケーション全体のプロバイダー設定
- **含むもの**: MantineProvider, ToastProvider, ColorSchemeScript
- **ナビゲーション**: なし（各グループで個別管理）

### 2. ゲストレイアウト (`app/(guest)/layout.tsx`)
- **役割**: 未認証ユーザー向けページのレイアウト
- **含むもの**: Header + コンテンツ + AppFooter
- **対象ページ**: ルート `/` (ランディングページ)

### 3. Legal レイアウト (`app/legal/layout.tsx`)
- **役割**: 法務ページのレイアウト
- **含むもの**: Header + コンテンツ + AppFooter
- **対象ページ**: FAQ, プライバシーポリシー, 利用規約

### 4. 認証レイアウト (`app/(auth)/layout.tsx`)
- **役割**: 認証関連ページの最小限レイアウト
- **含むもの**: 最小限のスタイリング
- **対象ページ**: ログイン, 登録, パスワード関連

### 5. メインレイアウト (`app/(main)/layout.tsx`)
- **役割**: 認証済みユーザー向けアプリケーションレイアウト
- **含むもの**: 
  - AuthGate (認証ガード)
  - MobileTopNav (モバイル下部ナビゲーション)
  - ConditionalSideNav (デスクトップサイドナビゲーション)
- **対象ページ**: タイムライン, アルバム, プロフィール, 検索, 通知

---

## コロケーションパターン

### ページ専用リソースの配置

Next.js App Router では、`_` プレフィックスを使用してルーティングから除外できます。

#### 推奨パターン

```
app/(main)/album/[id]/
├── page.tsx                    # ページコンポーネント
├── _components/                # このページ専用のコンポーネント
│   ├── AlbumHeader.tsx
│   └── GallerySection.tsx
└── _lib/                       # このページ専用のロジック
    ├── hooks/
    │   ├── useAlbumData.ts
    │   └── useComments.ts
    ├── services/
    │   └── imageService.ts
    └── types/
        └── album.types.ts
```

#### メリット
1. **関連ファイルの近接配置**: ページと関連リソースが同じディレクトリにある
2. **依存関係の明確化**: どのコンポーネント/ロジックがどのページで使われているか明確
3. **リファクタリングの容易さ**: ページ単位での移動・削除が簡単
4. **スコープの制限**: 他のページから誤って参照されるのを防ぐ

---

## パスエイリアス

`tsconfig.json` で設定:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 使用例

```typescript
// 絶対パスインポート
import { Button } from '@/components/ui/Button';
import { getUser } from '@/lib/db/repositories/user.repository';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
```

---

## ファイル命名規則

### コンポーネント
- **PascalCase**: `UserCard.tsx`, `AlbumGrid.tsx`
- **機能ベース**: 役割を明確に表現

### ユーティリティ/サービス
- **camelCase**: `dateUtils.ts`, `albumService.ts`
- **Repository**: `*.repository.ts` 形式

### カスタムフック
- **use プレフィックス**: `useAuthUser.ts`, `useAlbumData.ts`

### 型定義
- **小文字 + .ts**: `album.ts`, `firestore.ts`

---

## 今後の拡張予定

### 検討中の追加機能
- [ ] メッセージング機能 (`app/(main)/messages/`)
- [ ] 管理者ダッシュボード (`app/(admin)/`)
- [ ] PWA サポート強化
- [ ] i18n 多言語対応

---

## 変更履歴

### 2026-01-16
- **Phase 1-3 完了**: ディレクトリ構造の大規模リファクタリング
  - `src/` → `lib/` への移行
  - コンポーネントの機能別整理 (`features/`, `layout/`, `ui/`)
  - リポジトリファイル命名規則統一 (`*.repository.ts`)
  - ルートグループ導入 (`(auth)`, `(main)`)
  
- **ゲスト/Legal レイアウト追加**:
  - `(guest)` グループ作成: ルート `/` にヘッダー・フッター追加
  - `legal/` ディレクトリ作成: `/legal/*` ページにヘッダー・フッター追加
  - Header, AppFooter コンポーネント復元・配置

- **未使用ファイルクリーンアップ**:
  - HeaderGate, ThemeSwitch 等の未使用コンポーネントをアーカイブ

---

## 参考リンク

- [Next.js App Router ドキュメント](https://nextjs.org/docs/app)
- [Next.js ルートグループ](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Colocation Patterns](https://nextjs.org/docs/app/building-your-application/routing/colocation)

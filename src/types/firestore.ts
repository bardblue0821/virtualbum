// 基本データモデル (Firestore / Prisma 両対応の最低限版)
// Firestore 保存時は Date をそのまま入れると Timestamp に変換される。

// ユーザードキュメント (拡張版 - 後方互換)
export interface UserDoc {
  uid: string;
  displayName: string;
  handle: string | null;
  iconURL?: string | null;
  iconFullURL?: string | null;
  iconUpdatedAt?: Date | null;
  bio?: string | null;            // 最大500文字 (保存時サニタイズ)
  vrchatUrl?: string | null;      // VRChat関連URL 1件
  links?: string[];               // その他URL 最大3件
  language?: string | null;       // 言語コード/名称
  gender?: string | null;         // 'male' | 'female' | 'other' | 'unspecified' 等
  age?: number | null;            // 0〜150
  location?: string | null;       // 住んでいる場所 (自由入力)
  birthDate?: string | null;      // YYYY-MM-DD 形式 (表示用)
  provider?: string | null;       // 認証プロバイダー ('password' | 'google' | 'twitter')
  isAdmin?: boolean;
  createdAt?: Date;               // 初期作成時
  updatedAt?: Date;               // updateUser 実行時設定
}

export type AlbumVisibility = 'public' | 'friends';
export interface AlbumDoc { id: string; ownerId: string; title?: string; placeUrl?: string; visibility?: AlbumVisibility; createdAt: Date; updatedAt: Date }
export interface AlbumImageDoc { id: string; albumId: string; uploaderId: string; url: string; thumbUrl?: string; createdAt: Date }
export interface CommentDoc { id: string; albumId: string; userId: string; body: string; createdAt: Date }
export interface LikeDoc { id: string; albumId: string; userId: string; createdAt: Date }
export type FriendStatus = 'pending' | 'accepted'
export interface FriendDoc { id: string; userId: string; targetId: string; status: FriendStatus; createdAt: Date }
export interface WatchDoc { id: string; userId: string; ownerId: string; createdAt: Date }
export interface BlockedUserDoc { id: string; blockedAt: Date }
export interface ReactionDoc { id: string; albumId: string; userId: string; emoji: string; createdAt: Date }
export interface RepostDoc { id: string; albumId: string; userId: string; createdAt: Date }
export interface NotificationDoc { 
  id: string; 
  userId: string; 
  actorId: string; 
  type: string; 
  albumId?: string;
  friendRequestId?: string;
  message?: string;
  readAt?: Date | null;
  createdAt: Date;
}

// エラーコード用定数
export const ERR = {
  LIMIT_4_PER_USER: 'LIMIT_4_PER_USER',
  TOO_LONG: 'TOO_LONG',
  EMPTY: 'EMPTY',
} as const

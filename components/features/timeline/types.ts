/**
 * TimelineItem 関連の型定義
 */

export type Img = { 
  url: string; 
  thumbUrl?: string; 
  uploaderId?: string 
};

export type UserRef = {
  uid: string;
  handle: string | null;
  iconURL?: string | null;
  displayName?: string;
};

export type CommentPreviewData = {
  body: string;
  userId: string;
  user?: UserRef;
  createdAt?: FirestoreTimestamp | Date | number;
};

export type ImageAddedData = {
  userId: string;
  user?: UserRef;
  createdAt?: FirestoreTimestamp | Date | number;
};

export type RepostedByData = {
  userId: string;
  user?: UserRef;
  createdAt?: FirestoreTimestamp | Date | number;
};

export type ReactionData = {
  emoji: string;
  count: number;
  mine: boolean;
};

export type AlbumData = {
  id: string;
  ownerId: string;
  title?: string | null;
  visibility?: 'public' | 'friends';
  tags?: string[];
  createdAt?: FirestoreTimestamp | Date | number;
};

// Firestore Timestamp 互換型
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds?: number;
  toDate?: () => Date;
}

export interface TimelineItemProps {
  album: AlbumData;
  images: Img[];
  likeCount: number;
  liked: boolean;
  onLike: () => Promise<void> | void;
  repostCount?: number;
  reposted?: boolean;
  onToggleRepost?: () => Promise<void> | void;
  currentUserId?: string;
  onRequestDelete?: (albumId: string) => void;
  onRequestReport?: (albumId: string) => void;
  commentCount?: number;
  latestComment?: { body: string; userId: string };
  commentsPreview?: CommentPreviewData[];
  onCommentSubmit?: (text: string) => Promise<void>;
  submitting?: boolean;
  reactions?: ReactionData[];
  onToggleReaction?: (emoji: string) => void;
  owner?: UserRef;
  imageAdded?: ImageAddedData;
  repostedBy?: RepostedByData;
  isFriend?: boolean;
  isWatched?: boolean;
  onVisibilityChange?: (albumId: string, isVisible: boolean) => void;
}

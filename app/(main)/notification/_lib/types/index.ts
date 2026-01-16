export interface NotificationRow {
  id: string;
  type: string;
  actorId: string;
  userId: string; // 受信者
  message: string;
  createdAt?: any;
  readAt?: any;
  albumId?: string;
  commentId?: string;
  imageId?: string;
  friendRequestId?: string;
  commentBody?: string; // コメント本文
}

export interface GroupedNotification {
  key: string;
  type: string;
  albumId?: string;
  notifications: NotificationRow[];
  latestCreatedAt: any;
  actors: string[];
  isUnread: boolean;
}

export interface ActorInfo {
  handle?: string | null;
  displayName?: string | null;
  iconURL?: string | null;
}

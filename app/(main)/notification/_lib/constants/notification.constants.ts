import type { NotificationRow, GroupedNotification, ActorInfo } from '../types/index';

/**
 * 通知タイプ
 */
export const NOTIFICATION_TYPES = {
  REACTION: 'reaction',
  REPOST: 'repost',
  LIKE: 'like',
  IMAGE_ADDED: 'image_added',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  WATCH: 'watch',
  COMMENT: 'comment',
} as const;

/**
 * 通知タイプごとの絵文字
 */
export const NOTIFICATION_EMOJIS = {
  [NOTIFICATION_TYPES.REACTION]: '😊',
  [NOTIFICATION_TYPES.REPOST]: '🔁',
  [NOTIFICATION_TYPES.LIKE]: '❤️',
  [NOTIFICATION_TYPES.IMAGE_ADDED]: '🖼️',
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: '👋',
  [NOTIFICATION_TYPES.FRIEND_ACCEPTED]: '🤝',
  [NOTIFICATION_TYPES.WATCH]: '👀',
  [NOTIFICATION_TYPES.COMMENT]: '💬',
} as const;

/**
 * 通知アクションテキストのテンプレート
 */
export const NOTIFICATION_ACTION_TEMPLATES = {
  [NOTIFICATION_TYPES.LIKE]: {
    single: 'が${target}いいねしました。',
    multiple: 'が${target}いいねしました。',
  },
  [NOTIFICATION_TYPES.COMMENT]: {
    single: 'が${target}コメントしました。',
    multiple: 'が${target}${count}件コメントしました。',
  },
  [NOTIFICATION_TYPES.REPOST]: {
    single: 'が${target}リポストしました。',
  },
  [NOTIFICATION_TYPES.REACTION]: {
    single: 'が${target}リアクションしました。',
  },
  [NOTIFICATION_TYPES.IMAGE_ADDED]: {
    single: 'が画像を追加しました。',
    multiple: 'が${count}件の画像を追加しました。',
  },
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: {
    single: 'がフレンド申請しました。',
  },
  [NOTIFICATION_TYPES.WATCH]: {
    single: 'があなたをウォッチしました。',
  },
} as const;

/**
 * 通知タイプごとのリダイレクト先パス
 */
export const NOTIFICATION_HREF_TYPES = {
  ALBUM: ['like', 'comment', 'image', 'repost', 'reaction', 'image_added'],
  USER: ['friend_request', 'watch', 'friend_accepted'],
} as const;

/**
 * 表示設定
 */
export const NOTIFICATION_DISPLAY = {
  /** アクター情報の表示上限数 */
  MAX_VISIBLE_ACTORS: 3,
  /** 複数アクター時のサフィックス */
  REMAINING_ACTORS_SUFFIX: '人',
} as const;

/**
 * 日時フォーマット設定
 */
export const NOTIFICATION_DATE_FORMAT = {
  /** 日付と時刻の区切り文字 */
  DATE_TIME_SEPARATOR: ' ',
  /** 時刻と分の区切り文字 */
  TIME_SEPARATOR: ':',
} as const;

/**
 * エラーメッセージ
 */
export const NOTIFICATION_MESSAGES = {
  LOADING: '通知を読み込み中...',
  EMPTY: '通知はありません。',
  NOT_LOGGED_IN: 'ログインしてください。',
  ERROR_TITLE: 'エラー',
  MULTIPLE_NOTIFICATIONS: '件',
} as const;

/**
 * 通知タイプから絵文字を取得
 */
export function getNotificationEmoji(type: string): string {
  return NOTIFICATION_EMOJIS[type as keyof typeof NOTIFICATION_EMOJIS] || '🔔';
}

/**
 * 日時フォーマット
 */
export function formatDate(v: any): string {
  try {
    if (!v) return '';
    if (typeof v.toDate === 'function') v = v.toDate();
    const d = v instanceof Date ? v : new Date(v);
    const pad = (n: number) => n < 10 ? '0' + n : '' + n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

/**
 * グループ化された通知のアクションテキストを生成
 */
export function formatGroupActionText(g: GroupedNotification): string {
  const count = g.notifications.length;
  const actorCount = g.actors.length;
  const target = g.albumId ? 'あなたのアルバムに' : '';

  switch (g.type) {
    case 'like':
      return actorCount > 1
        ? `が${target}いいねしました。`
        : `が${target}いいねしました。`;
    case 'comment':
      return count > 1
        ? `が${target}${count}件コメントしました。`
        : `が${target}コメントしました。`;
    case 'repost':
      return `が${target}リポストしました。`;
    case 'reaction':
      return `が${target}リアクションしました。`;
    case 'image_added':
      return count > 1
        ? `が${count}件の画像を追加しました。`
        : `が画像を追加しました。`;
    case 'friend_request':
      return `がフレンド申請しました。`;
    case 'watch':
      return `があなたをウォッチしました。`;
    default:
      return `がアクションしました。`;
  }
}

/**
 * 通知のリダイレクト先URLを取得
 */
export function getNotificationHref(
  r: NotificationRow,
  actor?: ActorInfo
): string | undefined {
  if (NOTIFICATION_HREF_TYPES.ALBUM.includes(r.type as any)) {
    return r.albumId ? `/album/${r.albumId}` : undefined;
  }
  if (NOTIFICATION_HREF_TYPES.USER.includes(r.type as any)) {
    return (actor?.handle || r.actorId) ? `/user/${actor?.handle || r.actorId}` : undefined;
  }
  return undefined;
}

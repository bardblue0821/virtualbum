import type { NotificationRow, GroupedNotification, ActorInfo } from '../_lib/types';

// 通知タイプごとの絵文字
export function getNotificationEmoji(type: string): string {
  switch (type) {
    case 'reaction': return '😊';
    case 'repost': return '🔁';
    case 'like': return '❤️';
    case 'image_added': return '🖼️';
    case 'friend_request': return '👋';
    case 'friend_accepted': return '🤝';
    case 'watch': return '👀';
    case 'comment': return '💬';
    default: return '🔔';
  }
}

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

// グループ化された通知のアクションテキスト
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

export function getNotificationHref(
  r: NotificationRow,
  actor?: ActorInfo
): string | undefined {
  switch (r.type) {
    case 'like':
    case 'comment':
    case 'image':
    case 'repost':
    case 'reaction':
      return r.albumId ? `/album/${r.albumId}` : undefined;
    case 'friend_request':
    case 'watch':
      return (actor?.handle || r.actorId) ? `/user/${actor?.handle || r.actorId}` : undefined;
    default:
      return undefined;
  }
}

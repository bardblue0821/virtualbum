"use client";
import React, { useEffect, useState } from 'react';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { listNotifications, markAllRead, subscribeNotifications } from '@/lib/db/repositories/notification.repository';
import { getUser } from '@/lib/db/repositories/user.repository';
import { getFriendStatus, acceptFriend, cancelFriendRequest } from '@/lib/db/repositories/friend.repository';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { batchGetUsers } from '@/lib/utils/batchQuery';

interface NotificationRow {
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

// グループ化された通知
interface GroupedNotification {
  key: string;
  type: string;
  albumId?: string;
  notifications: NotificationRow[];
  latestCreatedAt: any;
  actors: string[];
  isUnread: boolean;
}

// 通知タイプごとの絵文字
function getNotificationEmoji(type: string): string {
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

export default function NotificationsPage(){
  const { user } = useAuthUser();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [actors, setActors] = useState<Record<string, { handle?: string|null; displayName?: string|null; iconURL?: string|null }>>({});
  const [friendState, setFriendState] = useState<Record<string, 'pending'|'accepted'|'none'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const { show } = useToast();

  // 通知をグループ化する関数
  function groupNotifications(notifications: NotificationRow[]): GroupedNotification[] {
    const groups: Record<string, GroupedNotification> = {};
    
    for (const n of notifications) {
      // グループキー: タイプ + アルバムID（または 'user' for watch/friend_request）
      const groupKey = n.albumId 
        ? `${n.type}:${n.albumId}`
        : `${n.type}:user:${n.actorId}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          type: n.type,
          albumId: n.albumId,
          notifications: [],
          latestCreatedAt: n.createdAt,
          actors: [],
          isUnread: false,
        };
      }
      
      groups[groupKey].notifications.push(n);
      if (!groups[groupKey].actors.includes(n.actorId)) {
        groups[groupKey].actors.push(n.actorId);
      }
      if (!n.readAt) {
        groups[groupKey].isUnread = true;
      }
      // 最新の日時を保持
      const nTime = toMillis(n.createdAt);
      const currentTime = toMillis(groups[groupKey].latestCreatedAt);
      if (nTime > currentTime) {
        groups[groupKey].latestCreatedAt = n.createdAt;
      }
    }
    
    // 最新順にソート
    return Object.values(groups).sort((a, b) => 
      toMillis(b.latestCreatedAt) - toMillis(a.latestCreatedAt)
    );
  }

  function toMillis(v: any): number {
    if (!v) return 0;
    if (v instanceof Date) return v.getTime();
    if (typeof v?.toDate === 'function') return v.toDate().getTime();
    if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000;
    if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
    return 0;
  }

  // フレンド申請承認/拒否アクション（即時UI反映）
  async function handleAccept(actorId: string){
    if (!user) return;
    try {
      await acceptFriend(actorId, user.uid); // 送信元(actorId) -> 受信者(user.uid)
      setFriendState(prev => ({ ...prev, [actorId]: 'accepted' }));
      show({ message: 'フレンド申請を承認しました', variant: 'success' });
    } catch (e:any){
      show({ message: '承認に失敗: ' + (e.message||'error'), variant: 'error' });
    }
  }
  async function handleDecline(actorId: string){
    if (!user) return;
    try {
      await cancelFriendRequest(actorId, user.uid);
      setFriendState(prev => ({ ...prev, [actorId]: 'none' }));
      show({ message: 'フレンド申請を拒否しました', variant: 'info' });
      // 既存通知は残すが状態は更新。必要なら rows から除去も検討。
    } catch (e:any){
      show({ message: '拒否に失敗: ' + (e.message||'error'), variant: 'error' });
    }
  }

  useEffect(() => {
    let active = true;
    if (!user){ setRows([]); setLoading(false); return; }
    
    // 通知画面を開いた時点で即座に全ての未読を既読化（バッジを0にする）
    markAllRead(user.uid).catch((err) => {
      console.error('[notification/page] markAllRead failed:', err);
    });
    
    (async () => {
      try {
        setLoading(true); setError(null);
        const initial = await listNotifications(user.uid, 100);
        if (!active) return;
        setRows(initial as NotificationRow[]);
        // 全通知の actor 情報を取得（重複排除）。友達申請はステータスも取得。
        const allActorIds = Array.from(new Set(initial.map(r => r.actorId))).filter(a => !!a);
        const actorProfiles: Record<string, { handle?: string|null; displayName?: string|null; iconURL?: string|null }> = {};
        for (const aid of allActorIds) {
          try {
            const u = await getUser(aid);
            actorProfiles[aid] = { handle: u?.handle || null, displayName: u?.displayName || null, iconURL: (u as any)?.iconURL || null };
            // friend_request ステータスのみ取得
            if (user && aid) {
              const st = await getFriendStatus(aid, user.uid);
              friendState[aid] = st === 'accepted' ? 'accepted' : (st === 'pending' ? 'pending' : 'none');
            }
          } catch {}
        }
        if (active) {
          setActors(actorProfiles);
          setFriendState({ ...friendState });
        }
        const unsub = await subscribeNotifications(user.uid, (list) => {
          if (!active) return;
          setRows(list as NotificationRow[]);
          // 差分で追加された actor を取得
          const newActors = Array.from(new Set(list.map(r => r.actorId))).filter(a => !actors[a]);
          if (newActors.length) {
            (async () => {
              const addProfiles: Record<string, { handle?: string|null; displayName?: string|null; iconURL?: string|null }> = {};
              for (const aid of newActors) {
                try {
                  const u = await getUser(aid);
                  addProfiles[aid] = { handle: u?.handle || null, displayName: u?.displayName || null, iconURL: (u as any)?.iconURL || null };
                  const st = await getFriendStatus(aid, user.uid);
                  friendState[aid] = st === 'accepted' ? 'accepted' : (st === 'pending' ? 'pending' : 'none');
                } catch {}
              }
              if (active) {
                setActors(prev => ({ ...prev, ...addProfiles }));
                setFriendState({ ...friendState });
              }
            })();
          }
        });
        return () => unsub();
      } catch(e:any){
        if (!active) return;
        setError(e.message || 'failed');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active=false; };
  }, [user]);

  if (!user) return <div className="max-w-2xl mx-auto p-4"><p className="text-sm fg-muted">ログインしてください。</p></div>;

  const grouped = groupNotifications(rows);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-background py-2 border-b border-line">
        <h1 className="text-2xl font-semibold">通知</h1>
      </div>
  {loading && <p className="text-sm fg-subtle">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
  {!loading && rows.length === 0 && <p className="text-sm fg-subtle">通知はありません。</p>}

      {/* まとめ表示（常時有効） */}
      {grouped.length > 0 && (
        <ul className="divide-y divide-line">
          {grouped.map(g => {
            const firstNotification = g.notifications[0];
            const firstActor = actors[firstNotification.actorId];
            const targetHref = getNotificationHref(firstNotification, firstActor);
            const actorCount = g.actors.length;
            const notificationCount = g.notifications.length;
            
            // 複数のアクターがいる場合の表示
            const actorNames = g.actors.slice(0, 3).map(aid => {
              const a = actors[aid];
              return a?.displayName || a?.handle || aid.slice(0, 6);
            }).join('、');
            const remainingActors = actorCount > 3 ? `他${actorCount - 3}人` : '';
            
            return (
              <li key={g.key} className={`py-3 text-sm ${g.isUnread ? 'surface-alt' : ''}`}>
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    {/* 複数アイコンを重ねて表示 */}
                    <div className="flex -space-x-2">
                      {g.actors.slice(0, 3).map((aid, idx) => {
                        const a = actors[aid];
                        return a?.iconURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            key={aid}
                            src={a.iconURL} 
                            alt="" 
                            className="h-10 w-10 rounded-md object-cover border-2 border-background"
                            style={{ zIndex: 3 - idx }}
                          />
                        ) : (
                          <span 
                            key={aid}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md surface-alt text-[12px] fg-muted border-2 border-background"
                            style={{ zIndex: 3 - idx }}
                          >
                            {(a?.displayName || '?').slice(0,1)}
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-xl" aria-label={g.type}>{getNotificationEmoji(g.type)}</span>
                    {notificationCount > 1 && (
                      <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                        {notificationCount}件
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="space-y-1">
                      {targetHref ? (
                        <Link href={targetHref} className="text-foreground hover:text-foreground">
                          <span className="font-medium">{actorNames}{remainingActors && `、${remainingActors}`}</span>
                          {formatGroupActionText(g)}
                        </Link>
                      ) : (
                        <p>
                          <span className="font-medium">{actorNames}{remainingActors && `、${remainingActors}`}</span>
                          {formatGroupActionText(g)}
                        </p>
                      )}
                      <p className="text-[11px] text-muted">{formatDate(g.latestCreatedAt)}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function doAccept(actorId: string){
  try {
    const { auth } = await import('@/lib/firebase');
    const me = auth.currentUser?.uid;
    if (!me) return;
    await acceptFriend(actorId, me);
    // 状態更新: friendState はクロージャ内なので再取得が必要 (簡易リフレッシュで十分)
    // トースト表示
    const { useToast } = await import('@/components/ui/Toast');
  } catch {}
}

async function doDecline(actorId: string){
  try {
    const { auth } = await import('@/lib/firebase');
    const me = auth.currentUser?.uid;
    if (!me) return;
    await cancelFriendRequest(actorId, me);
    // トーストはページ側の show を使うため noop (上記実装では直接は使えない)
  } catch {}
}

function formatDate(v:any){
  try {
    if (!v) return '';
    if (typeof v.toDate === 'function') v = v.toDate();
    const d = v instanceof Date ? v : new Date(v);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}
function pad(n:number){ return n<10 ? '0'+n : ''+n; }

// （旧）発信者表記は廃止したため未使用

function formatActorName(a?: { handle?: string|null; displayName?: string|null }, fallbackId?: string){
  const name = (a?.displayName || '').trim();
  const handle = (a?.handle || '').trim();
  if (name) return `${name}さんが`;
  if (handle) return `@${handle} さんが`;
  return (fallbackId ? `${fallbackId.slice(0,6)} さんが` : '誰かが');
}

function formatActionText(r: NotificationRow){
  // 何に / 何をしたか
  const target = r.albumId ? 'あなたのアルバムに' : (r.imageId ? 'あなたの画像に' : 'あなたの投稿に');
  switch(r.type){
    case 'like': return `${target}いいねしました。`;
    case 'comment': return `${target}コメントしました。`;
    case 'image': return `${target}画像を追加しました。`;
    case 'friend_request': return `あなたにフレンド申請しました。`;
    case 'watch': return `あなたをウォッチしました。`;
    case 'repost': return `${target}リポストしました。`;
    case 'reaction': return `${target}リアクションしました。`;
    default: return `アクションがありました。`;
  }
}

// グループ化された通知のアクションテキスト
function formatGroupActionText(g: GroupedNotification): string {
  const count = g.notifications.length;
  const actorCount = g.actors.length;
  const target = g.albumId ? 'あなたのアルバムに' : '';
  
  switch(g.type){
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

function getNotificationHref(r: NotificationRow, actor?: { handle?: string|null }): string | undefined {
  switch(r.type){
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

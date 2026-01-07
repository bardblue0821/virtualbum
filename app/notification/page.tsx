"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuthUser } from '@/src/hooks/useAuthUser';
import { listNotifications, markAllRead, subscribeNotifications } from '../../lib/repos/notificationRepo';
import { getUser } from '../../lib/repos/userRepo';
import { getFriendStatus, acceptFriend, cancelFriendRequest } from '../../lib/repos/friendRepo';
import { useToast } from '../../components/ui/Toast';
import Link from 'next/link';
import { batchGetUsers } from '../../lib/utils/batchQuery';
import { getOptimizedImageUrl } from '../../lib/utils/imageUrl';

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

// 通知タイプごとの絵文字
function getNotificationEmoji(type: string): string {
  switch (type) {
    case 'reaction': return '😊';
    case 'repost': return '🔁';
    case 'like': return '❤️';
    case 'image_added': return '🖼️';
    case 'friend_request': return '👋';
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
        // 既読化（未読のみ）
        markAllRead(user.uid).catch(()=>{});
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

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4 sticky top-0 z-10 bg-background py-2 border-b border-line">通知</h1>
  {loading && <p className="text-sm fg-subtle">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
  {!loading && rows.length === 0 && <p className="text-sm fg-subtle">通知はありません。</p>}
      <ul className="divide-y divide-line">
        {rows.map(r => {
          const isUnread = !r.readAt;
          const actor = actors[r.actorId];
          const targetHref = getNotificationHref(r, actor);
          const fState = r.type === 'friend_request' ? friendState[r.actorId] : undefined;
          const canActOnFriend = r.type === 'friend_request' && fState === 'pending';
          const actorName = formatActorName(actor, r.actorId);
          const actionText = formatActionText(r);
          return (
            <li key={r.id} className={`py-3 text-sm ${isUnread ? 'surface-alt' : ''}`}>
              <div className="flex flex-col items-start gap-2">
                {/* 誰が: アイコン + 通知種類の絵文字 */}
                <div className="flex items-center gap-2">
                  <Link href={`/user/${actor?.handle || r.actorId}`} className="block" aria-label="プロフィールへ">
                    {actor?.iconURL ? (
                      <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                        <Image 
                          src={actor.iconURL.startsWith('data:') ? actor.iconURL : getOptimizedImageUrl(actor.iconURL, 'thumb')} 
                          alt="" 
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized={actor.iconURL.startsWith('data:')}
                          onError={(e) => {
                            // リサイズ版が存在しない場合は元のURLにフォールバック
                            const target = e.target as HTMLImageElement;
                            if (actor?.iconURL && target.src !== actor.iconURL) {
                              target.src = actor.iconURL;
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md surface-alt text-[12px] fg-muted">
                        {(actorName || '?').slice(0,1)}
                      </span>
                    )}
                  </Link>
                  <span className="text-xl" aria-label={r.type}>{getNotificationEmoji(r.type)}</span>
                </div>
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="space-y-1">
                    {/* 「誰が」「何に」「何をしたか」 */}
                    {targetHref ? (
                      <Link href={targetHref} className="text-foreground hover:text-foreground">
                        <span className="font-medium">{actorName}</span>{actionText}
                      </Link>
                    ) : (
                      <p><span className="font-medium">{actorName}</span>{actionText}</p>
                    )}
                  {/* コメント本文を表示 */}
                  {r.type === 'comment' && r.commentBody && (
                    <p className="text-sm text-muted mt-1">「{r.commentBody}」</p>
                  )}
                  {r.type === 'friend_request' && (
                    <div className="text-xs fg-muted flex flex-wrap items-center gap-2">
                      {canActOnFriend && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAccept(r.actorId)}
                            className="rounded bg-blue-600 px-2 py-0.5 text-[11px] text-white"
                          >承認</button>
                          <button
                            type="button"
                            onClick={() => handleDecline(r.actorId)}
                            className="rounded bg-red-600 px-2 py-0.5 text-[11px] text-white"
                          >拒否</button>
                        </>
                      )}
                      {fState === 'accepted' && <span className="text-green-600">承認済み</span>}
                      {fState === 'none' && <span className="fg-subtle">状態: 不明</span>}
                    </div>
                  )}
                  <p className="text-[11px] text-muted">{formatDate(r.createdAt)}</p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

async function doAccept(actorId: string){
  try {
    const { auth } = await import('../../lib/firebase');
    const me = auth.currentUser?.uid;
    if (!me) return;
    await acceptFriend(actorId, me);
    // 状態更新: friendState はクロージャ内なので再取得が必要 (簡易リフレッシュで十分)
    // トースト表示
    const { useToast } = await import('../../components/ui/Toast');
  } catch {}
}

async function doDecline(actorId: string){
  try {
    const { auth } = await import('../../lib/firebase');
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

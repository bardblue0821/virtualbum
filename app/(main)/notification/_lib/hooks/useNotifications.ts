"use client";
import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { listNotifications, markAllRead, subscribeNotifications } from '@/lib/db/repositories/notification.repository';
import { getUser } from '@/lib/db/repositories/user.repository';
import { getFriendStatus, acceptFriend, cancelFriendRequest } from '@/lib/db/repositories/friend.repository';
import { useToast } from '@/components/ui/Toast';
import type { NotificationRow, GroupedNotification, ActorInfo } from '../types';

function toMillis(v: any): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000;
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  return 0;
}

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

export function useNotifications(user: User | null | undefined) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [actors, setActors] = useState<Record<string, ActorInfo>>({});
  const [friendState, setFriendState] = useState<Record<string, 'pending' | 'accepted' | 'none'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

  // フレンド申請承認
  const handleAccept = useCallback(async (actorId: string) => {
    if (!user) return;
    try {
      await acceptFriend(actorId, user.uid);
      setFriendState(prev => ({ ...prev, [actorId]: 'accepted' }));
      show({ message: 'フレンド申請を承認しました', variant: 'success' });
    } catch (e: any) {
      show({ message: '承認に失敗: ' + (e.message || 'error'), variant: 'error' });
    }
  }, [user, show]);

  // フレンド申請拒否
  const handleDecline = useCallback(async (actorId: string) => {
    if (!user) return;
    try {
      await cancelFriendRequest(actorId, user.uid);
      setFriendState(prev => ({ ...prev, [actorId]: 'none' }));
      show({ message: 'フレンド申請を拒否しました', variant: 'info' });
    } catch (e: any) {
      show({ message: '拒否に失敗: ' + (e.message || 'error'), variant: 'error' });
    }
  }, [user, show]);

  // 通知取得
  useEffect(() => {
    let active = true;
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    
    // 通知画面を開いた時点で即座に全ての未読を既読化
    markAllRead(user.uid).catch((err) => {
      console.error('[notification/page] markAllRead failed:', err);
    });
    
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const initial = await listNotifications(user.uid, 100);
        if (!active) return;
        setRows(initial as NotificationRow[]);
        
        // 全通知の actor 情報を取得
        const allActorIds = Array.from(new Set(initial.map(r => r.actorId))).filter(a => !!a);
        const actorProfiles: Record<string, ActorInfo> = {};
        const friendStates: Record<string, 'pending' | 'accepted' | 'none'> = {};
        
        for (const aid of allActorIds) {
          try {
            const u = await getUser(aid);
            actorProfiles[aid] = {
              handle: u?.handle || null,
              displayName: u?.displayName || null,
              iconURL: (u as any)?.iconURL || null,
            };
            // friend_request ステータスも取得
            if (user && aid) {
              const st = await getFriendStatus(aid, user.uid);
              friendStates[aid] = st === 'accepted' ? 'accepted' : (st === 'pending' ? 'pending' : 'none');
            }
          } catch {}
        }
        
        if (active) {
          setActors(actorProfiles);
          setFriendState(friendStates);
        }
        
        const unsub = await subscribeNotifications(user.uid, (list) => {
          if (!active) return;
          setRows(list as NotificationRow[]);
          
          // 差分で追加された actor を取得
          const currentActorIds = Object.keys(actorProfiles);
          const newActorIds = Array.from(new Set(list.map(r => r.actorId))).filter(
            a => a && !currentActorIds.includes(a)
          );
          
          if (newActorIds.length) {
            (async () => {
              const addProfiles: Record<string, ActorInfo> = {};
              const addFriendStates: Record<string, 'pending' | 'accepted' | 'none'> = {};
              
              for (const aid of newActorIds) {
                try {
                  const u = await getUser(aid);
                  addProfiles[aid] = {
                    handle: u?.handle || null,
                    displayName: u?.displayName || null,
                    iconURL: (u as any)?.iconURL || null,
                  };
                  const st = await getFriendStatus(aid, user.uid);
                  addFriendStates[aid] = st === 'accepted' ? 'accepted' : (st === 'pending' ? 'pending' : 'none');
                } catch {}
              }
              
              if (active) {
                setActors(prev => ({ ...prev, ...addProfiles }));
                setFriendState(prev => ({ ...prev, ...addFriendStates }));
              }
            })();
          }
        });
        
        return () => unsub();
      } catch (e: any) {
        if (!active) return;
        setError(e.message || 'failed');
      } finally {
        if (active) setLoading(false);
      }
    })();
    
    return () => {
      active = false;
    };
  }, [user]);

  const grouped = groupNotifications(rows);

  return {
    rows,
    grouped,
    actors,
    friendState,
    loading,
    error,
    handleAccept,
    handleDecline,
  };
}

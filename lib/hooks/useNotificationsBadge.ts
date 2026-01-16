"use client";
import { useEffect, useState } from 'react';
import { subscribeNotifications } from '@/lib/db/repositories/notification.repository';
import { useAuthUser } from './useAuthUser';

export function useNotificationsBadge(){
  const { user } = useAuthUser();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let unsubscribe: (() => void) | null = null;
    let active = true;
    // 初回: 購読して未読数計算
    (async () => {
      unsubscribe = await subscribeNotifications(user.uid, (rows) => {
        if (!active) return;
        const count = rows.filter(r => !r.readAt).length;
        setUnread(count);
      });
    })();
    return () => { 
      active = false; 
      if (unsubscribe) unsubscribe();
    };
  }, [user]);
  return unread;
}

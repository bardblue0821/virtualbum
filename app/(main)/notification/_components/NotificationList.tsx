"use client";
import React from 'react';
import type { GroupedNotification, ActorInfo } from '../_lib/types';
import { NotificationItem } from './NotificationItem';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { NOTIFICATION_MESSAGES } from '../_lib/constants/notification.constants';

interface NotificationListProps {
  grouped: GroupedNotification[];
  actors: Record<string, ActorInfo>;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
}

export function NotificationList({ grouped, actors, loading, error, isEmpty }: NotificationListProps) {
  if (loading) {
    return <LoadingSpinner size="sm" />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (isEmpty) {
    return <p className="text-sm fg-subtle">{NOTIFICATION_MESSAGES.EMPTY}</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {grouped.map(g => (
        <NotificationItem key={g.key} group={g} actors={actors} />
      ))}
    </ul>
  );
}

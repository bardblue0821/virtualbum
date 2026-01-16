"use client";
import React from 'react';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { useNotifications } from './_lib/hooks';
import { NotificationList } from './_components';
import { NOTIFICATION_MESSAGES } from './_lib/constants/notification.constants';

export default function NotificationsPage() {
  const { user } = useAuthUser();
  const {
    rows,
    grouped,
    actors,
    loading,
    error,
  } = useNotifications(user);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-sm fg-muted">{NOTIFICATION_MESSAGES.NOT_LOGGED_IN}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-background py-2 border-b border-line">
        <h1 className="text-2xl font-semibold">通知</h1>
      </div>
      
      <NotificationList
        grouped={grouped}
        actors={actors}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
      />
    </div>
  );
}

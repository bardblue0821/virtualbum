"use client";
import React from 'react';
import Link from 'next/link';
import type { GroupedNotification, ActorInfo } from '../_lib/types';
import { getNotificationEmoji, formatDate, formatGroupActionText, getNotificationHref } from '../_lib/utils';

interface NotificationItemProps {
  group: GroupedNotification;
  actors: Record<string, ActorInfo>;
}

export function NotificationItem({ group, actors }: NotificationItemProps) {
  const firstNotification = group.notifications[0];
  const firstActor = actors[firstNotification.actorId];
  const targetHref = getNotificationHref(firstNotification, firstActor);
  const actorCount = group.actors.length;
  const notificationCount = group.notifications.length;
  
  // 複数のアクターがいる場合の表示
  const actorNames = group.actors.slice(0, 3).map(aid => {
    const a = actors[aid];
    return a?.displayName || a?.handle || aid.slice(0, 6);
  }).join('、');
  const remainingActors = actorCount > 3 ? `他${actorCount - 3}人` : '';

  return (
    <li className={`py-3 text-sm ${group.isUnread ? 'surface-alt' : ''}`}>
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          {/* 複数アイコンを重ねて表示 */}
          <div className="flex -space-x-2">
            {group.actors.slice(0, 3).map((aid, idx) => {
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
                  {(a?.displayName || '?').slice(0, 1)}
                </span>
              );
            })}
          </div>
          <span className="text-xl" aria-label={group.type}>
            {getNotificationEmoji(group.type)}
          </span>
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
                <span className="font-medium">
                  {actorNames}
                  {remainingActors && `、${remainingActors}`}
                </span>
                {formatGroupActionText(group)}
              </Link>
            ) : (
              <p>
                <span className="font-medium">
                  {actorNames}
                  {remainingActors && `、${remainingActors}`}
                </span>
                {formatGroupActionText(group)}
              </p>
            )}
            <p className="text-[11px] text-muted">{formatDate(group.latestCreatedAt)}</p>
          </div>
        </div>
      </div>
    </li>
  );
}

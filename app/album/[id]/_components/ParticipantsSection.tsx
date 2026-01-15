/**
 * アルバム参加者一覧セクション
 */

import React, { useMemo } from 'react';
import Avatar from '@/components/profile/Avatar';
import type { ImageData, UploaderInfo } from '../_lib/types/album.types';

interface ParticipantsSectionProps {
  images: ImageData[];
  uploaderMap: Record<string, UploaderInfo>;
  albumOwnerId: string;
  myFriendIds: Set<string>;
}

export function ParticipantsSection({
  images,
  uploaderMap,
  albumOwnerId,
  myFriendIds,
}: ParticipantsSectionProps) {
  const sortedParticipantIds = useMemo(() => {
    if (images.length === 0) return [];

    // ユーザーごとの最後の投稿日時を取得
    const userLatestMap = new Map<string, number>();
    for (const img of images) {
      if (!img.uploaderId) continue;
      const ts = img.createdAt?.seconds ?? img.createdAt ?? 0;
      const current = userLatestMap.get(img.uploaderId) ?? 0;
      if (ts > current) userLatestMap.set(img.uploaderId, ts);
    }

    // オーナーを先頭、残りは最終投稿が新しい順にソート
    const ids = Array.from(new Set(images.map((img) => img.uploaderId).filter(Boolean)));
    ids.sort((a, b) => {
      if (a === albumOwnerId) return -1;
      if (b === albumOwnerId) return 1;
      const tsA = userLatestMap.get(a as string) ?? 0;
      const tsB = userLatestMap.get(b as string) ?? 0;
      return tsB - tsA; // 新しい順
    });

    return ids;
  }, [images, albumOwnerId]);

  if (sortedParticipantIds.length === 0) return null;

  return (
    <section aria-label="参加ユーザー" className="-mt-2">
      <div className="flex flex-wrap items-center gap-3">
        {sortedParticipantIds.map((uid) => {
          const icon = uploaderMap[uid!]?.iconURL || null;
          const handle = uploaderMap[uid!]?.handle || null;
          const href = `/user/${handle || uid}`;
          const isAlbumOwner = uid === albumOwnerId;
          const isMyFriend = myFriendIds.has(uid as string);

          // 枠の色: フレンドならオレンジ枠、それ以外は枠なし
          const borderClass = isMyFriend ? 'border-3 border-friend' : '';

          return (
            <a
              key={uid as string}
              href={href}
              aria-label="プロフィールへ"
              className="shrink-0 relative"
            >
              {/* 王冠マーク（オーナーのみ） */}
              {isAlbumOwner && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-yellow-500 drop-shadow-sm"
                  style={{ fontSize: '16px' }}
                >
                  👑
                </span>
              )}
              <Avatar
                src={icon || undefined}
                size={40}
                interactive={false}
                withBorder={false}
                className={`rounded-full ${borderClass}`}
              />
            </a>
          );
        })}
      </div>
    </section>
  );
}

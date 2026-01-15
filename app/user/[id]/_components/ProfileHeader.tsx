"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/profile/Avatar';
import EditPencilIcon from '@/components/icons/EditPencilIcon';
import ShareButton from '@/components/icons/ShareButton';
import { TagList } from '@/components/common/TagList';

interface ProfileHeaderProps {
  profile: {
    uid: string;
    displayName?: string | null;
    handle?: string | null;
    iconURL?: string | null;
    iconFullURL?: string | null;
    iconUpdatedAt?: any;
    bio?: string | null;
    vrchatUrl?: string | null;
  };
  userTags: string[];
  isMe: boolean;
  friendsCount: number;
  watchersCount: number;
  onAvatarClick: () => void;
  onEditClick: () => void;
  onFriendsClick: () => void;
  onWatchersClick: () => void;
  error?: string | null;
}

/**
 * プロフィールヘッダーコンポーネント
 * - アバター、表示名、ハンドル
 * - 自己紹介文、URL、タグ
 * - フレンド・ウォッチャー数
 */
export default function ProfileHeader({
  profile,
  userTags,
  isMe,
  friendsCount,
  watchersCount,
  onAvatarClick,
  onEditClick,
  onFriendsClick,
  onWatchersClick,
  error,
}: ProfileHeaderProps) {
  const router = useRouter();

  // 自己紹介テキスト内のURLをリンク化する関数
  function renderBioWithLinks(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[--accent] hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  }

  // アイコンURL生成（キャッシュバスティング対応）
  const avatarSrc = profile.iconURL
    ? `${profile.iconURL}${
        profile.iconUpdatedAt
          ? `?v=${new Date(
              (profile.iconUpdatedAt as any)?.seconds
                ? (profile.iconUpdatedAt as any).toDate?.()
                : profile.iconUpdatedAt
            ).getTime()}`
          : ''
      }`
    : undefined;

  return (
    <header className="space-y-3 relative">
      {/* 右上の編集ボタンと共有ボタン */}
      <div className="absolute top-0 right-0 flex items-center gap-1">
        {isMe && (
          <EditPencilIcon
            onClick={onEditClick}
            title="プロフィールを編集"
            size={18}
          />
        )}
        <ShareButton
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={`${profile.displayName || 'ユーザー'}のプロフィール`}
          size={18}
        />
      </div>

      <div className="flex items-center gap-4">
        <Avatar
          src={avatarSrc}
          size={72}
          onClick={onAvatarClick}
          withBorder={false}
        />
        <div className="min-w-0">
          <div className="flex flex-col">
            <h1
              className="text-2xl font-semibold truncate"
              title={profile.displayName || '名前未設定'}
            >
              {profile.displayName || '名前未設定'}
            </h1>
            <span
              className="text-sm text-muted truncate"
              title={profile.handle ? `@${profile.handle}` : 'ハンドル未設定'}
            >
              {profile.handle ? `@${profile.handle}` : 'ハンドル未設定'}
            </span>
          </div>

          {/* friend/watcher counts */}
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              className="text-xs text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]/40"
              onClick={onFriendsClick}
            >
              フレンド {friendsCount}
            </button>
            <button
              type="button"
              className="text-xs text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]/40"
              onClick={onWatchersClick}
            >
              ウォッチャー {watchersCount}
            </button>
          </div>
        </div>
      </div>

      {/* 自己紹介文 */}
      <div className="space-y-1">
        {profile.bio ? (
          <p className="text-sm whitespace-pre-line">
            {renderBioWithLinks(profile.bio)}
          </p>
        ) : (
          isMe && <p className="text-sm text-muted">自己紹介未設定</p>
        )}
      </div>

      {/* URL */}
      {(profile.vrchatUrl || isMe) && (
        <div className="space-y-1">
          {profile.vrchatUrl ? (
            <a
              href={profile.vrchatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[--accent] hover:underline break-all"
            >
              {profile.vrchatUrl}
            </a>
          ) : (
            isMe && <p className="text-sm text-muted">URL未設定</p>
          )}
        </div>
      )}

      {/* ユーザータグ */}
      <div className="space-y-1">
        {userTags.length > 0 ? (
          <TagList tags={userTags} />
        ) : (
          isMe && <span className="text-xs text-muted">タグなし</span>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </header>
  );
}

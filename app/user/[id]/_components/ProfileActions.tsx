"use client";
import React from 'react';
import FriendActions from '@/components/profile/FriendActions';
import WatchActions from '@/components/profile/WatchActions';
import BlockButton from '@/components/user/BlockButton';
import MuteButton from '@/components/user/MuteButton';
import { Button } from '@/components/ui/Button';

export type FriendState = 'none' | 'sent' | 'received' | 'accepted';

interface ProfileActionsProps {
  isMe: boolean;
  isLoggedIn: boolean;
  friendState: FriendState;
  friendBusy: boolean;
  watching: boolean;
  watchBusy: boolean;
  blocked: boolean;
  blockBusy: boolean;
  blockedByThem: boolean;
  muted: boolean;
  muteBusy: boolean;
  onSendFriend: () => void;
  onCancelFriend: () => void;
  onAcceptFriend: () => void;
  onRemoveFriend: () => void;
  onToggleWatch: () => void;
  onToggleBlock: () => Promise<void>;
  onToggleMute: () => Promise<void>;
  onDeleteAccount: () => void;
}

/**
 * プロフィールページのアクションボタン群
 * - 自分: アカウント削除ボタン
 * - 他者: フレンド/ウォッチ/ブロック/ミュート
 */
export default function ProfileActions({
  isMe,
  isLoggedIn,
  friendState,
  friendBusy,
  watching,
  watchBusy,
  blocked,
  blockBusy,
  blockedByThem,
  muted,
  muteBusy,
  onSendFriend,
  onCancelFriend,
  onAcceptFriend,
  onRemoveFriend,
  onToggleWatch,
  onToggleBlock,
  onToggleMute,
  onDeleteAccount,
}: ProfileActionsProps) {
  if (isMe) {
    return (
      <section className="space-y-2 pt-4 border-line">
        <Button type="button" variant="danger" size="sm" onClick={onDeleteAccount}>
          アカウントを削除
        </Button>
      </section>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex gap-3 flex-wrap">
        <p className="text-sm text-muted">ログインすると操作できます</p>
      </div>
    );
  }

  const isDisabled = blocked || blockedByThem;

  return (
    <div className="flex gap-3 flex-wrap">
      <FriendActions
        state={friendState}
        busy={friendBusy}
        disabled={isDisabled}
        onSend={onSendFriend}
        onCancel={onCancelFriend}
        onAccept={onAcceptFriend}
        onRemove={onRemoveFriend}
      />
      <WatchActions
        watching={watching}
        busy={watchBusy}
        onToggle={onToggleWatch}
        disabled={isDisabled}
      />
      <BlockButton blocked={blocked} busy={blockBusy} onToggle={onToggleBlock} />
      <MuteButton muted={muted} busy={muteBusy} onToggle={onToggleMute} />
    </div>
  );
}

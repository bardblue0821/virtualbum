"use client";
import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { getUser } from '@/lib/db/repositories/user.repository';

// Custom hooks
import {
  useProfile,
  useSocialActions,
  useProfileTabs,
  useDeleteAccount,
} from './_lib/hooks';

// Page components
import { ProfileHeader, ProfileTabs, ProfileActions } from './_components';

// Existing components
import Avatar from '@/components/features/profile/Avatar';
import AvatarModal from '@/components/features/profile/AvatarModal';
import ProfileEditModal from '@/components/features/profile/ProfileEditModal';
import FriendRemoveConfirmModal from '@/components/features/profile/FriendRemoveConfirmModal';
import DeleteConfirmModal from '@/components/features/album/DeleteConfirmModal';
import ReportConfirmModal from '@/components/features/album/ReportConfirmModal';
import { TimelineItem } from '@/components/features/timeline/TimelineItem';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Shared components
import UserListModal, { type UserListItem } from '@/app/(main)/user/[id]/_components/UserListModal';

export default function ProfilePage() {
  const params = useParams();
  const handleParam = params?.id as string | undefined;
  const { user } = useAuthUser();

  // Profile data hook
  const {
    profile,
    loading,
    error: profileError,
    setError: setProfileError,
    setProfile,
    userTags,
    tagCandidates,
    handleSaveProfile,
  } = useProfile(handleParam, user);

  // Social actions hook
  const {
    friendState,
    friendBusy,
    doSendFriend,
    doAcceptFriend,
    doCancelFriend,
    friendRemoveOpen,
    setFriendRemoveOpen,
    friendRemoveBusy,
    confirmFriendRemove,
    watching,
    watchBusy,
    doToggleWatch,
    blocked,
    blockBusy,
    blockedByThem,
    doToggleBlock,
    muted,
    muteBusy,
    doToggleMute,
    watchersCount,
    friendsCount,
    watchersIds,
    friendsOtherIds,
    error: socialError,
    setError: setSocialError,
  } = useSocialActions(user, profile?.uid);

  // Profile tabs hook
  const {
    listTab,
    setListTab,
    stats,
    likedCount,
    ownRows,
    joinedRows,
    likedRows,
    userComments,
    uploadedPhotos,
    uploadedLoading,
    uploadedError,
    uploadedErrorLink,
    sentinelRef,
    loadingExtra,
    extraError,
    likedLoading,
    likedError,
    handleToggleLike,
    handleToggleReaction,
    handleToggleRepost,
    handleSubmitComment,
    deleteTargetAlbumId,
    setDeleteTargetAlbumId,
    deleteBusy,
    handleConfirmDelete,
    reportTargetAlbumId,
    setReportTargetAlbumId,
    reportBusy,
    handleConfirmReport,
  } = useProfileTabs(user, profile);

  // Delete account hook
  const {
    showDeleteAccount,
    setShowDeleteAccount,
    agreeDelete,
    setAgreeDelete,
    deleting,
    deleteStep,
    pw,
    setPw,
    canReauthWithPassword,
    canReauthWithGoogle,
    doDeleteAccount,
    reauthGoogle,
  } = useDeleteAccount(user);

  // UI state
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  // Watchers/Friends modal state
  const [watchersOpen, setWatchersOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [watchersLoading, setWatchersLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [watchersUsers, setWatchersUsers] = useState<UserListItem[] | null>(null);
  const [friendsUsers, setFriendsUsers] = useState<UserListItem[] | null>(null);

  const isMe = user && profile && user.uid === profile.uid;
  const error = profileError || socialError;

  // Load watchers users
  const openWatchersModal = useCallback(async () => {
    setWatchersOpen(true);
    if (watchersUsers !== null) return;
    setWatchersLoading(true);
    try {
      const users = await Promise.all(
        watchersIds.map(async (uid) => {
          try {
            const u = await getUser(uid);
            return u as UserListItem | null;
          } catch {
            return null;
          }
        })
      );
      setWatchersUsers(users.filter(Boolean) as UserListItem[]);
    } finally {
      setWatchersLoading(false);
    }
  }, [watchersIds, watchersUsers]);

  // Load friends users
  const openFriendsModal = useCallback(async () => {
    setFriendsOpen(true);
    if (friendsUsers !== null) return;
    setFriendsLoading(true);
    try {
      const users = await Promise.all(
        friendsOtherIds.map(async (uid) => {
          try {
            const u = await getUser(uid);
            return u as UserListItem | null;
          } catch {
            return null;
          }
        })
      );
      setFriendsUsers(users.filter(Boolean) as UserListItem[]);
    } finally {
      setFriendsLoading(false);
    }
  }, [friendsOtherIds, friendsUsers]);

  // Tab configuration
  const tabConfig = [
    { key: 'own' as const, label: '作成アルバム', count: stats?.ownCount ?? 0 },
    { key: 'joined' as const, label: '参加アルバム', count: stats?.joinedCount ?? 0 },
    { key: 'comments' as const, label: 'コメント', count: stats?.commentCount ?? 0 },
    { key: 'images' as const, label: '投稿画像', count: uploadedPhotos?.length ?? stats?.imageCount ?? 0 },
    { key: 'likes' as const, label: 'いいね', count: likedCount, isPrivate: true },
  ];

  // Guard
  if (loading) return <LoadingSpinner size="sm" />;
  if (!profile) return <div className="p-4 text-sm text-muted">ユーザーが見つかりません (handle)</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Profile Header */}
      <ProfileHeader
        profile={profile}
        userTags={userTags}
        isMe={!!isMe}
        friendsCount={friendsCount}
        watchersCount={watchersCount}
        onAvatarClick={() => setAvatarOpen(true)}
        onEditClick={() => setProfileEditOpen(true)}
        onFriendsClick={openFriendsModal}
        onWatchersClick={openWatchersModal}
        error={error}
      />

      {/* Avatar Modal */}
      <AvatarModal
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        uid={profile.uid}
        src={
          isMe
            ? profile.iconURL || undefined
            : profile.iconFullURL || profile.iconURL || undefined
        }
        alt={(profile.displayName || profile.handle || 'ユーザー') + 'のアイコン'}
        editable={!!isMe}
        onUpdated={(thumbUrl, fullUrl) =>
          setProfile((p: any) => ({ ...p, iconURL: thumbUrl, iconFullURL: fullUrl, iconUpdatedAt: new Date() }))
        }
      />

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={profileEditOpen}
        onClose={() => setProfileEditOpen(false)}
        bio={profile.bio || ''}
        url={profile.vrchatUrl || ''}
        tags={userTags}
        tagCandidates={tagCandidates}
        onSave={handleSaveProfile}
      />

      {/* Profile Actions */}
      <ProfileActions
        isMe={!!isMe}
        isLoggedIn={!!user}
        friendState={friendState}
        friendBusy={friendBusy}
        watching={watching}
        watchBusy={watchBusy}
        blocked={blocked}
        blockBusy={blockBusy}
        blockedByThem={blockedByThem}
        muted={muted}
        muteBusy={muteBusy}
        onSendFriend={doSendFriend}
        onCancelFriend={doCancelFriend}
        onAcceptFriend={doAcceptFriend}
        onRemoveFriend={() => setFriendRemoveOpen(true)}
        onToggleWatch={doToggleWatch}
        onToggleBlock={doToggleBlock}
        onToggleMute={doToggleMute}
        onDeleteAccount={() => setShowDeleteAccount(true)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Friend Remove Confirm Modal */}
      <FriendRemoveConfirmModal
        open={friendRemoveOpen}
        busy={friendRemoveBusy}
        onCancel={() => { if (!friendRemoveBusy) setFriendRemoveOpen(false); }}
        onConfirm={() => { if (!friendRemoveBusy) confirmFriendRemove(); }}
      />

      {/* Blocked Content Notice */}
      {!isMe && (blocked || blockedByThem) ? (
        <section className="space-y-4 pt-4 border-t border-line">
          <div className="bg-surface-weak border border-line rounded p-4 space-y-2">
            <p className="text-sm font-medium">
              {blocked ? 'このユーザーをブロック中です' : 'このユーザーのコンテンツは表示できません'}
            </p>
            <p className="text-xs text-muted">
              {blocked
                ? 'ブロックを解除するとアルバムなどのコンテンツを表示できます。'
                : 'このユーザーからのアクセスが制限されています。'}
            </p>
          </div>
        </section>
      ) : (
        /* Main Content Section */
        <section className="space-y-4 pt-4 border-t border-line">
          {loadingExtra && <LoadingSpinner size="sm" />}
          {extraError && <p className="text-sm text-red-600">{extraError}</p>}

          <div className="space-y-4 mt-4">
            {/* Tabs */}
            <ProfileTabs
              activeTab={listTab}
              onTabChange={setListTab}
              tabs={tabConfig}
              isMe={!!isMe}
            />

            {/* Tab Panels */}
            {listTab === 'own' && (
              <div role="tabpanel" aria-label="作成アルバム">
                {ownRows.length === 0 && <p className="text-sm text-muted/80">まだアルバムがありません</p>}
                {ownRows.length > 0 && (
                  <div className="divide-y divide-line *:pb-12">
                    {ownRows.map((row, i) => (
                      <TimelineItem
                        key={row.album.id}
                        album={row.album}
                        images={row.images}
                        likeCount={row.likeCount}
                        liked={row.liked}
                        onLike={user ? () => handleToggleLike('own', i) : () => {}}
                        repostCount={row.repostCount}
                        reposted={row.reposted}
                        onToggleRepost={user ? () => handleToggleRepost('own', i) : undefined}
                        currentUserId={user?.uid}
                        onRequestDelete={setDeleteTargetAlbumId}
                        onRequestReport={setReportTargetAlbumId}
                        commentCount={row.commentCount}
                        latestComment={row.latestComment}
                        commentsPreview={row.commentsPreview}
                        onCommentSubmit={user ? (text) => handleSubmitComment('own', i, text) : undefined}
                        reactions={row.reactions}
                        onToggleReaction={user ? (emoji) => handleToggleReaction('own', i, emoji) : undefined}
                        owner={row.owner}
                        isFriend={friendState === 'accepted'}
                        isWatched={watching}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {listTab === 'joined' && (
              <div role="tabpanel" aria-label="参加アルバム">
                {joinedRows.length === 0 && <p className="text-sm text-muted/80">参加アルバムはまだありません</p>}
                {joinedRows.length > 0 && (
                  <div className="divide-y divide-line *:pb-12">
                    {joinedRows.map((row, i) => (
                      <TimelineItem
                        key={row.album.id}
                        album={row.album}
                        images={row.images}
                        likeCount={row.likeCount}
                        liked={row.liked}
                        onLike={user ? () => handleToggleLike('joined', i) : () => {}}
                        repostCount={row.repostCount}
                        reposted={row.reposted}
                        onToggleRepost={user ? () => handleToggleRepost('joined', i) : undefined}
                        currentUserId={user?.uid}
                        onRequestDelete={setDeleteTargetAlbumId}
                        onRequestReport={setReportTargetAlbumId}
                        commentCount={row.commentCount}
                        latestComment={row.latestComment}
                        commentsPreview={row.commentsPreview}
                        onCommentSubmit={user ? (text) => handleSubmitComment('joined', i, text) : undefined}
                        reactions={row.reactions}
                        onToggleReaction={user ? (emoji) => handleToggleReaction('joined', i, emoji) : undefined}
                        owner={row.owner}
                        isFriend={false}
                        isWatched={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {listTab === 'comments' && (
              <div role="tabpanel" aria-label="コメント">
                {(!userComments || userComments.length === 0) && (
                  <p className="text-sm text-muted/80">コメントはまだありません</p>
                )}
                <ul className="divide-y divide-line">
                  {userComments?.map((c) => (
                    <li key={c.id} className="py-3">
                      <a
                        href={`/album/${c.albumId}`}
                        className="block hover:bg-surface-weak rounded-md p-2 -m-2 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground/80 truncate">{c.albumTitle}</p>
                          <p className="text-sm whitespace-pre-line line-clamp-2">{c.body}</p>
                          <p className="text-[10px] text-muted/60">
                            {c.createdAt?.toDate?.().toLocaleString?.() || ''}
                          </p>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {listTab === 'images' && (
              <div role="tabpanel" aria-label="投稿画像" className="space-y-2">
                {uploadedLoading && <LoadingSpinner size="sm" />}
                {uploadedError && (
                  <div className="space-y-1">
                    <p className="text-sm text-red-600">{uploadedError}</p>
                    {uploadedErrorLink && (
                      <a
                        href={uploadedErrorLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm link-accent"
                      >
                        インデックス作成を開く
                      </a>
                    )}
                  </div>
                )}
                {uploadedPhotos && uploadedPhotos.length === 0 && !uploadedLoading && (
                  <p className="text-sm text-muted/80">投稿画像はまだありません</p>
                )}
                {uploadedPhotos && uploadedPhotos.length > 0 && (
                  <GalleryGrid
                    photos={uploadedPhotos}
                    layoutType="grid"
                    columns={4}
                    margin={6}
                    enableLightbox
                    lightboxPlugins={[]}
                    lightboxThumbnail={false}
                  />
                )}
                <div ref={sentinelRef} className="h-10" />
              </div>
            )}

            {/* Likes tab (self only) */}
            {isMe && listTab === 'likes' && (
              <div role="tabpanel" aria-label="いいね">
                {likedLoading && <LoadingSpinner size="sm" />}
                {likedError && <p className="text-sm text-red-600">{likedError}</p>}
                {!likedLoading && likedRows.length === 0 && (
                  <p className="text-sm text-muted/80">いいねしたアルバムはまだありません</p>
                )}
                {likedRows.length > 0 && (
                  <div className="divide-y divide-line *:pb-12">
                    {likedRows.map((row, i) => (
                      <TimelineItem
                        key={row.album.id}
                        album={row.album}
                        images={row.images}
                        likeCount={row.likeCount}
                        liked={row.liked}
                        onLike={() => handleToggleLike('liked', i)}
                        repostCount={row.repostCount}
                        reposted={row.reposted}
                        onToggleRepost={() => handleToggleRepost('liked', i)}
                        currentUserId={user?.uid}
                        onRequestDelete={setDeleteTargetAlbumId}
                        onRequestReport={setReportTargetAlbumId}
                        commentCount={row.commentCount}
                        latestComment={row.latestComment}
                        commentsPreview={row.commentsPreview}
                        onCommentSubmit={(text) => handleSubmitComment('liked', i, text)}
                        reactions={row.reactions}
                        onToggleReaction={(emoji) => handleToggleReaction('liked', i, emoji)}
                        owner={row.owner}
                        isFriend={false}
                        isWatched={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="relative bg-surface-weak border border-line rounded shadow-lg max-w-sm w-[90%] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-red-600">アカウント削除の確認</h3>
            <p className="text-xs text-muted">
              この操作は元に戻せません。作成したアルバム/コメント/いいね/フレンド/ウォッチは削除されます（通知は残る場合があります）。
            </p>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={agreeDelete}
                onChange={(e) => setAgreeDelete(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              理解しました
            </label>
            {canReauthWithPassword && (
              <div>
                <label className="block text-xs text-muted mb-1">パスワード（再認証）</label>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  inputMode="text"
                  lang="en"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full border-b-2 border-[--accent] bg-transparent p-1 text-sm focus:outline-none"
                  placeholder="現在のパスワード"
                />
              </div>
            )}
            {deleting && <p className="text-xs text-muted">処理中: {deleteStep || '...'}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={deleting}
                onClick={() => setShowDeleteAccount(false)}
              >
                キャンセル
              </Button>
              {canReauthWithGoogle && (
                <Button type="button" variant="ghost" size="md" disabled={deleting} onClick={reauthGoogle}>
                  Googleで再認証
                </Button>
              )}
              <Button
                type="button"
                variant="danger"
                size="md"
                disabled={!agreeDelete || deleting || (canReauthWithPassword && !pw)}
                onClick={doDeleteAccount}
              >
                削除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Watchers List Modal */}
      <UserListModal
        open={watchersOpen}
        onClose={() => setWatchersOpen(false)}
        title="ウォッチャー"
        count={watchersCount}
        users={watchersUsers}
        loading={watchersLoading}
        emptyMessage="ウォッチャーはいません"
      />

      {/* Friends List Modal */}
      <UserListModal
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        title="フレンド"
        count={friendsCount}
        users={friendsUsers}
        loading={friendsLoading}
        emptyMessage="フレンドはいません"
      />

      {/* Album Action Modals */}
      <DeleteConfirmModal
        open={!!deleteTargetAlbumId}
        busy={deleteBusy}
        onCancel={() => { if (!deleteBusy) setDeleteTargetAlbumId(null); }}
        onConfirm={() => { if (!deleteBusy) void handleConfirmDelete(); }}
      />
      <ReportConfirmModal
        open={!!reportTargetAlbumId}
        busy={reportBusy}
        onCancel={() => { if (!reportBusy) setReportTargetAlbumId(null); }}
        onConfirm={() => { if (!reportBusy) void handleConfirmReport(); }}
      />
    </div>
  );
}

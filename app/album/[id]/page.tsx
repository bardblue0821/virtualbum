"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { type PhotoItem } from "@/components/gallery/GalleryGrid";
import AlbumHeader from "@/components/album/AlbumHeader";
import ReactionsBar from "@/components/album/ReactionsBar";
import GallerySection from "@/components/album/GallerySection";
import CommentsSection from "@/components/album/CommentsSection";
import DeleteConfirmModal from "@/components/album/DeleteConfirmModal";
import ImageManageModal from "@/components/album/ImageManageModal";
import Avatar from "@/components/profile/Avatar";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { useToast } from "@/components/ui/Toast";
import { useThumbBackfill } from "@/src/hooks/useThumbBackfill";
import { useAlbumAccess } from "@/src/hooks/useAlbumAccess";
import { REACTION_CATEGORIES } from "@/lib/constants/reactions";
import { listImages } from "@/lib/repos/imageRepo";
import { listAcceptedFriends } from "@/lib/repos/friendRepo";
import { getAllAlbumTags, updateAlbumTags } from "@/lib/repos/tagRepo";

// 分割したカスタムフック
import {
  useAlbumData,
  useLikes,
  useReactions,
  useComments,
  useAlbumEdit,
  useImageActions,
} from "./hooks";

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params?.id as string | undefined;
  const { user } = useAuthUser();
  const router = useRouter();
  const toast = useToast();

  // window に getIdToken を公開（フック内から利用）
  useEffect(() => {
    if (user) {
      (window as any).__getIdToken = () => user.getIdToken();
    }
    return () => {
      delete (window as any).__getIdToken;
    };
  }, [user]);

  // ========================================
  // 分割したフックを使用
  // ========================================
  
  // データ取得
  const {
    album,
    setAlbum,
    images,
    setImages,
    comments,
    reactions,
    setReactions,
    uploaderMap,
    loading,
    error,
    setError,
  } = useAlbumData(albumId, user?.uid);

  // 権限判定
  const isOwner = !!(user && album?.ownerId === user.uid);
  const { isFriend, isWatcher, isBlockedByOwner, isBlockingOwner } = useAlbumAccess(album?.ownerId, user?.uid);
  const isPrivate = album?.visibility === 'friends';
  const isBlocked = isBlockedByOwner || isBlockingOwner;

  // いいね
  const { likeCount, liked, likeBusy, handleToggleLike } = useLikes(
    albumId,
    user?.uid,
    setError
  );

  // リアクション
  const {
    pickerOpen,
    setPickerOpen,
    emojiQuery,
    setEmojiQuery,
    activeCat,
    setActiveCat,
    filteredEmojis,
    categoryEmojis,
    hoveredEmoji,
    reactorMap,
    reactorLoading,
    pickerRef,
    pickerBtnRef,
    handleToggleReaction,
    onChipEnter,
    onChipLeave,
  } = useReactions(albumId, user?.uid, album, reactions, setReactions, setError, toast);

  // コメント
  const {
    editingCommentId,
    editingCommentBody,
    commentText,
    commenting,
    setCommentText,
    setEditingCommentBody,
    beginEditComment,
    cancelEditComment,
    saveEditComment,
    handleDeleteComment,
    submitComment,
  } = useComments(albumId, user?.uid, comments, isOwner, isFriend, isWatcher, isPrivate, setError, toast);

  // アルバム編集
  const {
    editTitle,
    editPlaceUrl,
    savingAlbum,
    showDeleteConfirm,
    deleting,
    setEditTitle,
    setEditPlaceUrl,
    handleChangeVisibility,
    saveTitleIfChanged,
    savePlaceUrlIfChanged,
    handleInputKeyDownBlurOnEnter,
    askDeleteAlbum,
    confirmDeleteAlbum,
    setShowDeleteConfirm,
  } = useAlbumEdit(albumId, album, setAlbum, setError, toast, router);

  // 画像操作
  const {
    showDeleteImageConfirm,
    deletingImage,
    showDeleteLastImageModal,
    askDeleteImage,
    confirmDeleteImage,
    confirmDeleteLastImageWithAlbum,
    cancelDeleteLastImage,
    setShowDeleteImageConfirm,
    setDeletingImageId,
  } = useImageActions(albumId, user?.uid, images, setImages, isOwner, isFriend, setError, router);

  // 表示件数
  const [visibleCount, setVisibleCount] = useState(16);

  // 画像管理モーダル
  const [imageManageModalOpen, setImageManageModalOpen] = useState(false);

  // タグ候補
  const [tagCandidates, setTagCandidates] = useState<string[]>([]);
  useEffect(() => {
    getAllAlbumTags(100).then(setTagCandidates).catch(() => {});
  }, []);

  // タグ更新ハンドラ
  const handleTagsChange = async (newTags: string[]) => {
    if (!albumId || !user?.uid) return;
    await updateAlbumTags(albumId, newTags, user.uid);
    setAlbum((prev: any) => (prev ? { ...prev, tags: newTags } : prev));
  };

  // ログインユーザーのフレンドIDセット
  const [myFriendIds, setMyFriendIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user?.uid) {
      setMyFriendIds(new Set());
      return;
    }
    let cancelled = false;
    listAcceptedFriends(user.uid).then((docs) => {
      if (cancelled) return;
      const ids = new Set<string>();
      for (const d of docs) {
        if (d.userId === user.uid) ids.add(d.targetId);
        else if (d.targetId === user.uid) ids.add(d.userId);
      }
      setMyFriendIds(ids);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.uid]);

  // サムネイル自動生成
  useThumbBackfill(albumId, images, visibleCount, setImages);

  // album.title/placeUrl が更新されたら editTitle/editPlaceUrl も更新
  useEffect(() => {
    if (album) {
      setEditTitle(album.title ?? "");
      setEditPlaceUrl(album.placeUrl ?? "");
    }
  }, [album, setEditTitle, setEditPlaceUrl]);

  // ========================================
  // ギャラリー表示用データ
  // ========================================
  const photos: PhotoItem[] = useMemo(() => {
    return images.map((img) => ({
      id: img.id,
      src: img.url,
      thumbSrc: img.thumbUrl || img.url,
      width: 1200,
      height: 1200,
      alt: img.id || "image",
      uploaderId: img.uploaderId,
      uploaderIconURL: img.uploaderId ? (uploaderMap[img.uploaderId]?.iconURL || null) : null,
      uploaderHandle: img.uploaderId ? (uploaderMap[img.uploaderId]?.handle || null) : null,
      createdAt: img.createdAt,
    }));
  }, [images, uploaderMap]);

  // ========================================
  // 早期リターン
  // ========================================
  if (!albumId) {
    return <div className="text-sm fg-subtle">アルバムIDが指定されていません。</div>;
  }

  if (loading) return <div className="text-sm fg-subtle">読み込み中...</div>;

  // ブロック判定: オーナーにブロックされている or オーナーをブロックしている場合は表示しない
  if (isBlocked && !isOwner) {
    return (
      <div className="text-sm fg-muted p-8 text-center">
        <p className="text-lg mb-2">⚠️</p>
        <p>このアルバムは表示できません</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="text-sm fg-muted">
        {error ?? "アルバムが見つかりません"}
      </div>
    );
  }

  // 計算値
  const myCount = images.filter((img) => img.uploaderId === user?.uid).length;
  const remaining = 4 - myCount;
  const canAddImages = !!user && (isOwner || isFriend);
  const canPostComment = !!user && (isOwner || isFriend || (!isPrivate && isWatcher));

  // ========================================
  // レンダリング
  // ========================================
  return (
    <div className="space-y-6">
      <AlbumHeader
        album={album as any}
        isOwner={isOwner}
        editTitle={editTitle}
        editPlaceUrl={editPlaceUrl}
        savingAlbum={savingAlbum}
        onTitleChange={setEditTitle}
        onPlaceUrlChange={setEditPlaceUrl}
        onTitleBlur={saveTitleIfChanged}
        onPlaceUrlBlur={savePlaceUrlIfChanged}
        onInputKeyDownBlurOnEnter={handleInputKeyDownBlurOnEnter}
        onVisibilityChange={handleChangeVisibility}
        tags={album.tags || []}
        tagCandidates={tagCandidates}
        onTagsChange={handleTagsChange}
      />

      {/* 参加ユーザーのアイコン一覧 */}
      {images.length > 0 && (
        (() => {
          // ユーザーごとの最後の投稿日時を取得
          const userLatestMap = new Map<string, number>();
          for (const img of images) {
            if (!img.uploaderId) continue;
            const ts = img.createdAt?.seconds ?? img.createdAt ?? 0;
            const current = userLatestMap.get(img.uploaderId) ?? 0;
            if (ts > current) userLatestMap.set(img.uploaderId, ts);
          }
          
          // オーナーを先頭、残りは最終投稿が新しい順にソート
          const ids = Array.from(new Set(images.map(img => img.uploaderId).filter(Boolean)));
          ids.sort((a, b) => {
            if (a === album.ownerId) return -1;
            if (b === album.ownerId) return 1;
            const tsA = userLatestMap.get(a as string) ?? 0;
            const tsB = userLatestMap.get(b as string) ?? 0;
            return tsB - tsA; // 新しい順
          });
          
          if (ids.length === 0) return null;
          return (
            <section aria-label="参加ユーザー" className="-mt-2">
              <div className="flex flex-wrap items-center gap-3">
                {ids.map((uid) => {
                  const icon = uploaderMap[uid!]?.iconURL || null;
                  const handle = uploaderMap[uid!]?.handle || null;
                  const href = `/user/${handle || uid}`;
                  const isAlbumOwner = uid === album.ownerId;
                  const isMyFriend = myFriendIds.has(uid as string);
                  
                  // 枠の色: フレンドならオレンジ枠、それ以外は枠なし
                  const borderClass = isMyFriend ? "border-3 border-friend" : "";
                  
                  return (
                    <a key={uid as string} href={href} aria-label="プロフィールへ" className="shrink-0 relative">
                      {/* 王冠マーク（オーナーのみ） */}
                      {isAlbumOwner && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-yellow-500 drop-shadow-sm" style={{ fontSize: '16px' }}>
                          👑
                        </span>
                      )}
                      <Avatar src={icon || undefined} size={40} interactive={false} withBorder={false} className={`rounded-full ${borderClass}`} />
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })()
      )}

      <ReactionsBar
        liked={liked}
        likeCount={likeCount}
        likeBusy={!user || likeBusy}
        onToggleLike={handleToggleLike}
        reactions={reactions}
        hoveredEmoji={hoveredEmoji}
        onChipEnter={onChipEnter}
        onChipLeave={onChipLeave}
        reactorMap={reactorMap}
        reactorLoading={reactorLoading}
        pickerOpen={pickerOpen}
        onTogglePicker={() => setPickerOpen((o) => !o)}
        emojiQuery={emojiQuery}
        onEmojiQueryChange={setEmojiQuery}
        activeCat={activeCat}
        onActiveCatChange={(key) => setActiveCat(key as any)}
        filteredEmojis={filteredEmojis}
        categoryEmojis={categoryEmojis}
        categories={REACTION_CATEGORIES}
        onPickEmoji={(e) => handleToggleReaction(e)}
      />

      <GallerySection
        photos={photos}
        imagesLength={images.length}
        visibleCount={visibleCount}
        onSeeMore={() => setVisibleCount((n) => Math.min(images.length, n + 16))}
        canDelete={(p) => {
          if (isOwner) return true;
          if (isFriend) return p.uploaderId === user?.uid;
          return false;
        }}
        onDelete={(p) => { if (p.id) askDeleteImage(p.id); }}
        showUploader={!!(user && canAddImages)}
        remaining={remaining}
        onOpenManageModal={() => setImageManageModalOpen(true)}
      />

      <CommentsSection
        comments={comments as any}
        currentUserId={user?.uid ?? ''}
        albumOwnerId={album.ownerId}
        canPostComment={!!(user && canPostComment)}
        editingCommentId={editingCommentId}
        editingValue={editingCommentBody}
        commentText={commentText}
        commenting={commenting}
        onEditRequest={beginEditComment}
        onEditChange={(_, value) => setEditingCommentBody(value)}
        onEditSave={saveEditComment}
        onEditCancel={cancelEditComment}
        onDelete={handleDeleteComment}
        onSubmit={submitComment}
        onChangeText={setCommentText}
      />

      {isOwner && (
        <section>
          <div className="pt-3 mt-2">
            <button
              type="button"
              onClick={askDeleteAlbum}
              className="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
            >アルバムを削除</button>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <DeleteConfirmModal
        open={showDeleteConfirm}
        busy={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteAlbum}
      />

      <DeleteConfirmModal
        open={showDeleteImageConfirm}
        busy={deletingImage}
        onCancel={() => { setShowDeleteImageConfirm(false); setDeletingImageId(null); }}
        onConfirm={confirmDeleteImage}
        message="この画像を削除しますか？"
        description="この操作は取り消せません。画像を削除します。"
      />

      <DeleteConfirmModal
        open={showDeleteLastImageModal}
        busy={deleting}
        onCancel={cancelDeleteLastImage}
        onConfirm={confirmDeleteLastImageWithAlbum}
        message="最後の画像を削除しようとしています"
        description="アルバムには最低1枚の画像が必要です。画像を削除する場合は、アルバムごと削除されます。アルバムを削除しますか？"
      />

      {/* 画像管理モーダル */}
      <ImageManageModal
        open={imageManageModalOpen}
        onClose={() => setImageManageModalOpen(false)}
        albumId={albumId!}
        userId={user?.uid || ''}
        existingImages={images
          .filter((img) => img.uploaderId === user?.uid)
          .map((img) => ({
            id: img.id,
            url: img.url,
            thumbUrl: img.thumbUrl,
            uploaderId: img.uploaderId,
          }))}
        onUploaded={async () => {
          const imgs = await listImages(albumId!);
          imgs.sort(
            (a: any, b: any) =>
              (b.createdAt?.seconds || b.createdAt || 0) -
              (a.createdAt?.seconds || a.createdAt || 0),
          );
          setImages(imgs as any);
        }}
        onDeleteImage={async (imageId: string) => {
          // 削除API呼び出し
          const token = await user!.getIdToken();
          const res = await fetch('/api/images/delete', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ albumId, userId: user!.uid, imageId }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || 'DELETE_FAILED');
          }
          // ローカルステートからも削除
          setImages((prev) => prev.filter((img) => img.id !== imageId));
        }}
      />
    </div>
  );
}

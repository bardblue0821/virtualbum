"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { type PhotoItem } from "@/components/gallery/GalleryGrid";
import AlbumHeader from "@/components/album/AlbumHeader";
import ReactionsBar from "@/components/album/ReactionsBar";
import GallerySection from "@/components/album/GallerySection";
import CommentsSection from "@/components/album/CommentsSection";
import DeleteConfirmModal from "@/components/album/DeleteConfirmModal";
import Avatar from "@/components/profile/Avatar";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { useToast } from "@/components/ui/Toast";
import { useThumbBackfill } from "@/src/hooks/useThumbBackfill";
import { useAlbumAccess } from "@/src/hooks/useAlbumAccess";
import { REACTION_CATEGORIES } from "@/lib/constants/reactions";
import { listImages } from "@/lib/repos/imageRepo";

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
  const { isFriend, isWatcher } = useAlbumAccess(album?.ownerId, user?.uid);
  const isPrivate = album?.visibility === 'friends';

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
    }));
  }, [images, uploaderMap]);

  // ========================================
  // 早期リターン
  // ========================================
  if (!albumId) {
    return <div className="text-sm fg-subtle">アルバムIDが指定されていません。</div>;
  }

  if (loading) return <div className="text-sm fg-subtle">読み込み中...</div>;

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
      />

      {/* 参加ユーザーのアイコン一覧 */}
      {images.length > 0 && (
        (() => {
          const ids = Array.from(new Set(images.map(img => img.uploaderId).filter(Boolean)));
          if (ids.length === 0) return null;
          return (
            <section aria-label="参加ユーザー" className="-mt-2">
              <div className="flex flex-wrap items-center gap-2">
                {ids.map((uid) => {
                  const icon = uploaderMap[uid!]?.iconURL || null;
                  const handle = uploaderMap[uid!]?.handle || null;
                  const href = `/user/${handle || uid}`;
                  return (
                    <a key={uid as string} href={href} aria-label="プロフィールへ" className="shrink-0">
                      <Avatar src={icon || undefined} size={28} interactive={false} withBorder={false} className="rounded-full" />
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
        albumId={albumId!}
        userId={user?.uid || ''}
        remaining={remaining}
        onUploaded={async () => {
          const imgs = await listImages(albumId!);
          imgs.sort(
            (a: any, b: any) =>
              (b.createdAt?.seconds || b.createdAt || 0) -
              (a.createdAt?.seconds || a.createdAt || 0),
          );
          setImages(imgs as any);
        }}
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
        onEditChange={(_, value) => setCommentText(value)}
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
    </div>
  );
}

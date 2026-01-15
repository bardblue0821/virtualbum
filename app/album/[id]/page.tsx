"use client";
import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AlbumHeader from "@/components/album/AlbumHeader";
import ReactionsBar from "@/components/album/ReactionsBar";
import GallerySection from "@/components/album/GallerySection";
import CommentsSection from "@/components/album/CommentsSection";
import DeleteConfirmModal from "@/components/album/DeleteConfirmModal";
import ImageManageModal from "@/components/album/ImageManageModal";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { useToast } from "@/components/ui/Toast";
import { useThumbBackfill } from "@/src/hooks/useThumbBackfill";
import { REACTION_CATEGORIES } from "@/lib/constants/reactions";
import { AlbumPermissionGuard } from "./_components/AlbumPermissionGuard";
import { ParticipantsSection } from "./_components/ParticipantsSection";
import { IMAGE_LIMITS, MODAL_MESSAGES } from "./_lib/constants/album.constants";
import {
  useAlbumPermissions,
  useMyFriends,
  useAlbumTags,
  useGalleryPhotos,
  useGalleryPermissions,
  useImageManagement,
  useVisibleCount,
} from "./_lib/hooks";
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

  useEffect(() => {
    if (user) {
      (window as any).__getIdToken = () => user.getIdToken();
    }
    return () => {
      delete (window as any).__getIdToken;
    };
  }, [user]);

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

  const { isOwner, isFriend, isWatcher, isPrivate, isBlocked, canAddImages, canPostComment } =
    useAlbumPermissions(album, user?.uid);

  const { likeCount, liked, likeBusy, handleToggleLike } = useLikes(albumId, user?.uid, setError);

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

  const { visibleCount, handleSeeMore } = useVisibleCount(images.length);
  const myFriendIds = useMyFriends(user?.uid);
  const { tagCandidates, handleTagsChange } = useAlbumTags(albumId, user?.uid, setAlbum);
  const photos = useGalleryPhotos(images, uploaderMap);
  const { canDelete } = useGalleryPermissions(isOwner, isFriend, user?.uid);
  const {
    imageManageModalOpen,
    setImageManageModalOpen,
    existingImages,
    handleImageUploaded,
    handleDeleteImage,
  } = useImageManagement(albumId, user?.uid, images, setImages);

  useThumbBackfill(albumId, images, visibleCount, setImages);

  useEffect(() => {
    if (album) {
      setEditTitle(album.title ?? "");
      setEditPlaceUrl(album.placeUrl ?? "");
    }
  }, [album, setEditTitle, setEditPlaceUrl]);

  const myCount = images.filter((img) => img.uploaderId === user?.uid).length;
  const remaining = IMAGE_LIMITS.PER_USER - myCount;

  return (
    <AlbumPermissionGuard
      albumId={albumId}
      loading={loading}
      album={album}
      error={error}
      isBlocked={isBlocked}
      isOwner={isOwner}
    >
      {(album) => (
      <div className="space-y-6">
      <AlbumHeader
        album={album}
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

      <ParticipantsSection
        images={images}
        uploaderMap={uploaderMap}
        albumOwnerId={album.ownerId}
        myFriendIds={myFriendIds}
      />

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
        onSeeMore={handleSeeMore}
        canDelete={canDelete}
        onDelete={(p) => p.id && askDeleteImage(p.id)}
        showUploader={canAddImages}
        remaining={remaining}
        onOpenManageModal={() => setImageManageModalOpen(true)}
      />

      <CommentsSection
        comments={comments as any}
        currentUserId={user?.uid ?? ''}
        albumOwnerId={album!.ownerId}
        canPostComment={canPostComment}
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
        message={MODAL_MESSAGES.DELETE_IMAGE.title}
        description={MODAL_MESSAGES.DELETE_IMAGE.description}
      />

      <DeleteConfirmModal
        open={showDeleteLastImageModal}
        busy={deleting}
        onCancel={cancelDeleteLastImage}
        onConfirm={confirmDeleteLastImageWithAlbum}
        message={MODAL_MESSAGES.DELETE_LAST_IMAGE.title}
        description={MODAL_MESSAGES.DELETE_LAST_IMAGE.description}
      />

      {/* 画像管理モーダル */}
      <ImageManageModal
        open={imageManageModalOpen}
        onClose={() => setImageManageModalOpen(false)}
        albumId={albumId!}
        userId={user?.uid || ''}
        existingImages={existingImages}
        onUploaded={handleImageUploaded}
        onDeleteImage={handleDeleteImage}
      />
      </div>
      )}
    </AlbumPermissionGuard>
  );
}

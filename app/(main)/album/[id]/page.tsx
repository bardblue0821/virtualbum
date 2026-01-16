"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import AlbumHeader from "./_components/AlbumHeader";
import ReactionsBar from "./_components/ReactionsBar";
import GallerySection from "./_components/GallerySection";
import CommentsSection from "./_components/CommentsSection";
import DeleteConfirmModal from "@/components/features/album/DeleteConfirmModal";
import ImageManageModal from "./_components/ImageManageModal";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { useToast } from "@/components/ui/Toast";
import { useThumbBackfill } from "@/lib/hooks/useThumbBackfill";
import { REACTION_CATEGORIES } from "@/lib/constants/reactions";
import { AlbumPermissionGuard } from "./_components/AlbumPermissionGuard";
import { ParticipantsSection } from "./_components/ParticipantsSection";
import { IMAGE_LIMITS, MODAL_MESSAGES } from "./_lib/constants/album.constants";
import {
  useAlbumData,
  useAlbumEdit,
  useAlbumPermissions,
  useAlbumTags,
  useComments,
  useGalleryPermissions,
  useGalleryPhotos,
  useImageActions,
  useImageManagement,
  useLikes,
  useMyFriends,
  useReactions,
  useVisibleCount,
} from "./_lib/hooks";

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params?.id as string | undefined;
  const { user } = useAuthUser();
  const router = useRouter();
  const toast = useToast();

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

  const { likeCount, liked, likeBusy, handleToggleLike } = useLikes(
    albumId,
    user?.uid,
    setError,
    user?.getIdToken
  );

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
  } = useImageManagement(albumId, user?.uid, images, setImages, user?.getIdToken);

  useThumbBackfill(albumId, images, visibleCount, setImages);

  const userUploadedCount = images.filter((img) => img.uploaderId === user?.uid).length;
  const remainingUploadSlots = IMAGE_LIMITS.PER_USER - userUploadedCount;

  return (
    <AlbumPermissionGuard
      albumId={albumId}
      loading={loading}
      album={album}
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
        onTogglePicker={() => setPickerOpen(!pickerOpen)}
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
        remaining={remainingUploadSlots}
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
          <div className="mt-2">
            <Button variant="danger" size="sm" onClick={askDeleteAlbum}>
              アルバム削除
            </Button>
          </div>
        </section>
      )}

      <ErrorMessage error={error} />

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

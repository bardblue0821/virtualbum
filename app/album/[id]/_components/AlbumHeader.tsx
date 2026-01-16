import React, { useState } from "react";
import TagInput from "@/components/form/TagInput";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

type Album = {
  ownerId: string;
  title?: string;
  placeUrl?: string;
  links?: string[];
  visibility?: "public" | "friends";
  tags?: string[];
} | null;

export interface AlbumHeaderProps {
  album: Album;
  isOwner: boolean;
  editTitle: string;
  editPlaceUrl: string;
  savingAlbum: boolean;
  onTitleChange: (v: string) => void;
  onPlaceUrlChange: (v: string) => void;
  onTitleBlur: () => void;
  onPlaceUrlBlur: () => void;
  onInputKeyDownBlurOnEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onVisibilityChange?: (v: "public" | "friends") => void;
  tags?: string[];
  tagCandidates?: string[];
  onTagsChange?: (tags: string[]) => Promise<void>;
}

export default function AlbumHeader(props: AlbumHeaderProps) {
  const {
    album,
    isOwner,
    editTitle,
    editPlaceUrl,
    savingAlbum,
    onTitleChange,
    onPlaceUrlChange,
    onTitleBlur,
    onPlaceUrlBlur,
    onVisibilityChange,
    tags = [],
    tagCandidates = [],
    onTagsChange,
  } = props;

  const router = useRouter();
  const [editingTags, setEditingTags] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(tags);
  const [savingTags, setSavingTags] = useState(false);
  const [editingTitleUrl, setEditingTitleUrl] = useState(false);

  React.useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  const handleSaveTags = async () => {
    if (onTagsChange == null) return;
    setSavingTags(true);
    try {
      await onTagsChange(localTags);
      setEditingTags(false);
    } catch (e) {
      console.error("Failed to save tags:", e);
    } finally {
      setSavingTags(false);
    }
  };

  const handleCancelTags = () => {
    setLocalTags(tags);
    setEditingTags(false);
  };

  const displayTitle = (() => {
    const t = album?.title ?? "";
    const s = (t + "").trim();
    return s.length > 0 ? s : "Untitled";
  })();

  const handleSaveTitleUrl = () => {
    onTitleBlur();
    onPlaceUrlBlur();
    setEditingTitleUrl(false);
  };

  const handleTagClick = (tag: string) => {
    router.push("/search?q=" + encodeURIComponent(tag));
  };

  const notOwner = isOwner === false;
  const showEditMode = editingTitleUrl === true;

  return (
    <div>
      {notOwner && (
        <h1 className="font-bold text-2xl flex items-center gap-2">
          {displayTitle}
          {album?.visibility === "friends" && (
            <span
              className="text-[11px] px-2 py-0.5 rounded bg-muted/20 text-muted shrink-0"
              title="Friends only"
            >
              Friends
            </span>
          )}
        </h1>
      )}

      {isOwner && (
        <div className="space-y-3">
          {showEditMode ? (
            <div className="space-y-3">
              <div>
                <input
                  value={editTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitleUrl();
                  }}
                  className="input-underline font-bold text-2xl w-full"
                  placeholder="Title"
                  aria-label="Album title"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={editPlaceUrl}
                  onChange={(e) => onPlaceUrlChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitleUrl();
                  }}
                  className="input-underline flex-1 text-sm"
                  placeholder="Place or URL"
                  aria-label="Place URL"
                />
                <Button size="sm" variant="accent" onClick={handleSaveTitleUrl}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingTitleUrl(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl flex items-center gap-2">
                {displayTitle}
                {album?.visibility === "friends" && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded bg-muted/20 text-muted shrink-0"
                    title="Friends only"
                  >
                    Friends
                  </span>
                )}
              </h1>
              <button
                type="button"
                onClick={() => setEditingTitleUrl(true)}
                className="text-muted hover:text-accent p-1 rounded hover:bg-muted/10"
                title="Edit title and URL"
                aria-label="Edit"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
            </div>
          )}

          {album?.placeUrl && editingTitleUrl === false && (
            <p className="text-sm fg-muted flex items-center gap-1">
              <span>Location:</span>
              {album.placeUrl.startsWith("http") ? (
                <a
                  href={album.placeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  {album.placeUrl}
                </a>
              ) : (
                <span>{album.placeUrl}</span>
              )}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <label
              htmlFor="album-visibility-select"
              className="text-xs fg-muted"
            >
              Visibility:
            </label>
            <select
              id="album-visibility-select"
              value={album?.visibility ?? "public"}
              onChange={(e) =>
                onVisibilityChange?.(e.target.value as "public" | "friends")
              }
              disabled={savingAlbum}
              className="select-minimal text-xs"
            >
              <option value="public">Public</option>
              <option value="friends">Friends only</option>
            </select>
          </div>
        </div>
      )}

      {album?.placeUrl && notOwner && (
        <p className="text-sm fg-muted flex items-center gap-1 mt-2">
          <span>Location:</span>
          {album.placeUrl.startsWith("http") ? (
            <a
              href={album.placeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              {album.placeUrl}
            </a>
          ) : (
            <span>{album.placeUrl}</span>
          )}
        </p>
      )}

      {tags.length > 0 && editingTags === false && (
        <div className="flex items-center gap-2 flex-wrap mt-3">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className="inline-block text-xs px-2 py-1 rounded bg-muted/20 text-accent hover:bg-accent/10 border border-accent/30 cursor-pointer"
            >
              #{tag}
            </button>
          ))}
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditingTags(true)}
              className="text-xs px-2 py-1 rounded border border-dashed border-muted/50 text-muted hover:border-accent hover:text-accent cursor-pointer"
              aria-label="Edit tags"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {editingTags && (
        <div className="mt-3 space-y-2">
          <TagInput
            tags={localTags}
            candidates={tagCandidates}
            onChange={setLocalTags}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="accent"
              onClick={handleSaveTags}
              disabled={savingTags}
            >
              {savingTags ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelTags}
              disabled={savingTags}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {tags.length === 0 && editingTags === false && isOwner && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setEditingTags(true)}
            className="text-xs px-2 py-1 rounded border border-dashed border-muted/50 text-muted hover:border-accent hover:text-accent cursor-pointer"
            aria-label="Add tags"
          >
            + Add tags
          </button>
        </div>
      )}
    </div>
  );
}

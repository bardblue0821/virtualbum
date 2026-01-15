export interface AlbumData {
  id: string;
  ownerId: string;
  title: string | null;
  placeUrl: string | null;
  visibility: 'public' | 'friends';
  tags: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface ImageData {
  id: string;
  albumId: string;
  uploaderId: string;
  url: string;
  thumbUrl?: string | null;
  createdAt?: any;
}

export interface CommentData {
  id: string;
  albumId: string;
  userId: string;
  body: string;
  createdAt?: any;
}

export interface ReactionData {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface UploaderInfo {
  iconURL: string | null;
  handle: string | null;
}

export interface AlbumPermissions {
  isOwner: boolean;
  canEdit: boolean;
  canView: boolean;
  canComment: boolean;
  canUpload: boolean;
  canDelete: boolean;
}

export interface AccessInfo {
  isFriend: boolean;
  isWatcher: boolean;
  isBlockedByOwner: boolean;
  isBlockingOwner: boolean;
}

export interface ImageLimits {
  myCount: number;
  remaining: number;
  canUploadMore: boolean;
}

export interface EditState {
  title: string;
  placeUrl: string;
  isSaving: boolean;
}

export interface EditHandlers {
  onTitleChange: (value: string) => void;
  onPlaceUrlChange: (value: string) => void;
  onTitleBlur: () => void;
  onPlaceUrlBlur: () => void;
  onVisibilityChange: (visibility: 'public' | 'friends') => Promise<void>;
}

export interface TagState {
  tags: string[];
  candidates: string[];
  onChange: (tags: string[]) => Promise<void>;
}

export interface ParticipantInfo {
  userId: string;
  uploaderIconURL: string | null;
  uploaderHandle: string | null;
  imageCount: number;
}

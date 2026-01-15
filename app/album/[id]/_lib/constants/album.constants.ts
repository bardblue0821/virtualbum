export const IMAGE_LIMITS = {
  PER_USER: 4,
  INITIAL_VISIBLE: 16,
  LOAD_MORE_COUNT: 16,
};

export const MODAL_MESSAGES = {
  DELETE_IMAGE: {
    title: 'この画像を削除しますか？',
    description: 'この操作は取り消せません。画像を削除します。',
  },
  DELETE_LAST_IMAGE: {
    title: '最後の画像を削除しようとしています',
    description: 'アルバムには最低1枚の画像が必要です。画像を削除する場合は、アルバムごと削除されます。アルバムを削除しますか？',
  },
} as const;

export const ERROR_MESSAGES = {
  NO_ALBUM_ID: 'アルバムIDが指定されていません。',
  ALBUM_NOT_FOUND: 'アルバムが見つかりません',
  CANNOT_VIEW_ALBUM: 'このアルバムは表示できません',
  DELETE_FAILED: '削除に失敗しました',
} as const;

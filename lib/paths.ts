// Firestore コレクション名定義
export const COL = {
  users: 'users',
  albums: 'albums',
  albumImages: 'albumImages',
  comments: 'comments',
  likes: 'likes',
  friends: 'friends',
  watches: 'watches',
  notifications: 'notifications',
  reactions: 'reactions',
  reposts: 'reposts',
  // サブコレクション: users/{userId}/blockedUsers
  blockedUsers: 'blockedUsers',
  // サブコレクション: users/{userId}/mutedUsers
  mutedUsers: 'mutedUsers',
  // タグ関連
  userTags: 'userTags',
  albumTags: 'albumTags',
} as const

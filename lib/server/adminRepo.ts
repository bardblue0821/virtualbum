/**
 * Admin SDK を使用した Firestore 操作
 * サーバーサイド専用
 */
export { 
  adminAddImage, 
  adminDeleteImage, 
  adminAddComment, 
  adminToggleLike, 
  adminToggleReaction,
  adminToggleRepost,
  adminGetFriendStatus
} from '@/src/repositories/admin/firestore';

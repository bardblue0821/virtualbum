import type { ImageRecord, ParticipantInfo, UploaderInfo } from '../types/album.types';
import { IMAGE_LIMITS } from '../constants/album.constants';

/*画像データと uploaderMap から参加者情報を集計してソートする*/
export function processParticipants(
  images: ImageRecord[],
  uploaderMap: Record<string, UploaderInfo>
): ParticipantInfo[] {
  const userImageCounts = new Map<string, number>();

  images.forEach((img) => {
    const count = userImageCounts.get(img.uploaderId) || 0;
    userImageCounts.set(img.uploaderId, count + 1);
  });

  return Array.from(userImageCounts.entries())
    .map(([userId, imageCount]) => ({
      userId,
      uploaderIconURL: uploaderMap[userId]?.iconURL || null,
      uploaderHandle: uploaderMap[userId]?.handle || null,
      imageCount,
    }))
    .sort((a, b) => b.imageCount - a.imageCount);
}

/*ユーザーごとの画像枚数制限チェック*/
export function checkImageLimitPerUser(
  images: ImageRecord[],
  currentUserId: string
): {
  canUpload: boolean;
  currentCount: number;
  limit: number;
} {
  const currentCount = images.filter((img) => img.uploaderId === currentUserId).length;
  return {
    canUpload: currentCount < IMAGE_LIMITS.PER_USER,
    currentCount,
    limit: IMAGE_LIMITS.PER_USER,
  };
}

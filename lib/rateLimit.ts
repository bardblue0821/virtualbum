import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export type RateLimitAction = 'register' | 'comment' | 'album' | 'image' | 'reaction';

/**
 * レート制限チェック
 * @param action アクション種別
 * @throws レート制限エラーを含むエラーオブジェクト
 */
export async function checkRateLimit(action: RateLimitAction): Promise<void> {
  const checkRateLimitCallable = httpsCallable<
    { action: RateLimitAction },
    { success: boolean }
  >(functions, 'checkRateLimitCallable');

  try {
    await checkRateLimitCallable({ action });
  } catch (error: any) {
    // Firebase Functions からのエラー
    if (error.code === 'functions/resource-exhausted') {
      const remainingTime = error.details?.remainingTime;
      throw new RateLimitError(error.message, remainingTime);
    }
    throw error;
  }
}

/**
 * レート制限エラークラス
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public remainingTime?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * レート制限エラーかどうかを判定
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

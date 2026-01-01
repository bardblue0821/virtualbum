import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// レート制限設定（5分あたり）
const RATE_LIMITS = {
  register: 1,      // ユーザー登録
  comment: 5,       // コメント投稿
  album: 3,         // アルバム作成
  image: 10,        // 画像追加
  reaction: 15,     // リアクション追加
};

const WINDOW_MS = 5 * 60 * 1000; // 5分

/**
 * 管理者チェック
 */
async function isAdmin(uid: string): Promise<boolean> {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data()?.isAdmin === true;
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

/**
 * レート制限チェック
 */
async function checkRateLimit(
  uid: string,
  action: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remainingTime?: number }> {
  // 管理者は制限なし
  if (await isAdmin(uid)) {
    return { allowed: true };
  }

  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const limit = RATE_LIMITS[action];

  const rateLimitRef = db.collection('rateLimits').doc(uid);
  const actionRef = rateLimitRef.collection('actions').doc(action);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const actionDoc = await transaction.get(actionRef);
      
      let timestamps: number[] = [];
      if (actionDoc.exists) {
        timestamps = (actionDoc.data()?.timestamps || []) as number[];
      }

      // 5分以内のアクションのみ残す
      timestamps = timestamps.filter((ts) => ts > windowStart);

      // 制限チェック
      if (timestamps.length >= limit) {
        const oldestInWindow = Math.min(...timestamps);
        const remainingTime = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
        return { allowed: false, remainingTime };
      }

      // 新しいタイムスタンプを追加
      timestamps.push(now);

      // 更新
      transaction.set(actionRef, { timestamps }, { merge: true });

      return { allowed: true };
    });

    return result;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // エラー時は許可（フェイルオープン）
    return { allowed: true };
  }
}

/**
 * Callable関数: レート制限チェック
 */
export const checkRateLimitCallable = functions.https.onCall(
  async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
    }

    const { action } = data;
    if (!action || !(action in RATE_LIMITS)) {
      throw new functions.https.HttpsError('invalid-argument', '無効なアクションです');
    }

    const result = await checkRateLimit(uid, action as keyof typeof RATE_LIMITS);

    if (!result.allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `操作が多すぎます。${result.remainingTime}秒後に再試行してください。`,
        { remainingTime: result.remainingTime }
      );
    }

    return { success: true };
  }
);

/**
 * ユーザーのレート制限履歴をクリーンアップ（定期実行）
 */
export const cleanupRateLimits = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = Date.now();
    const cutoff = now - WINDOW_MS;

    const snapshot = await db.collection('rateLimits').get();
    const batch = db.batch();
    let count = 0;

    for (const userDoc of snapshot.docs) {
      const actionsSnapshot = await userDoc.ref.collection('actions').get();
      
      for (const actionDoc of actionsSnapshot.docs) {
        const timestamps = (actionDoc.data()?.timestamps || []) as number[];
        const filtered = timestamps.filter((ts) => ts > cutoff);

        if (filtered.length === 0) {
          // 削除
          batch.delete(actionDoc.ref);
          count++;
        } else if (filtered.length < timestamps.length) {
          // 更新
          batch.update(actionDoc.ref, { timestamps: filtered });
          count++;
        }
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Cleaned up ${count} rate limit records`);
    }

    return null;
  });

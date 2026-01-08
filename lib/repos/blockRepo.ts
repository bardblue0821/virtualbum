/**
 * ブロック機能のリポジトリ
 * 
 * ユーザーのブロック/解除、ブロック状態の取得を担当
 * ブロック時にはフレンド関係・ウォッチ・申請を自動解除
 */

import { db } from '../firebase';
import { COL } from '../paths';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import type { BlockedUserDoc } from '@/src/types/firestore';
import { AppError, ErrorHelpers } from '../errors/ErrorHandler';

/**
 * ブロック済みユーザーのサブコレクション参照を取得
 */
function blockedUsersRef(userId: string) {
  return collection(db, COL.users, userId, COL.blockedUsers);
}

/**
 * ブロック済みユーザードキュメントの参照を取得
 */
function blockedUserDocRef(userId: string, blockedId: string) {
  return doc(db, COL.users, userId, COL.blockedUsers, blockedId);
}

/**
 * ユーザーをブロックする
 * 副作用: フレンド関係・ウォッチ・申請を双方向で解除
 */
export async function blockUser(userId: string, targetId: string): Promise<void> {
  if (userId === targetId) {
    throw ErrorHelpers.selfOperation('ブロック');
  }

  const ref = blockedUserDocRef(userId, targetId);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    throw ErrorHelpers.duplicate('ブロック');
  }

  // ブロック実行
  const now = new Date();
  await setDoc(ref, { id: targetId, blockedAt: now } satisfies BlockedUserDoc);

  // 副作用: フレンド関係・ウォッチ・申請を解除
  await cleanupRelationships(userId, targetId);
}

/**
 * ブロックを解除する
 */
export async function unblockUser(userId: string, targetId: string): Promise<void> {
  if (userId === targetId) {
    throw ErrorHelpers.selfOperation('ブロック解除');
  }

  const ref = blockedUserDocRef(userId, targetId);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    throw ErrorHelpers.notFound('ブロック');
  }

  await deleteDoc(ref);
}

/**
 * ブロック状態をトグルする
 * @returns 新しいブロック状態 (true: ブロック中, false: 解除)
 */
export async function toggleBlock(userId: string, targetId: string): Promise<boolean> {
  if (userId === targetId) {
    throw ErrorHelpers.selfOperation('ブロック');
  }

  const ref = blockedUserDocRef(userId, targetId);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    // 解除
    await deleteDoc(ref);
    return false;
  } else {
    // ブロック
    const now = new Date();
    await setDoc(ref, { id: targetId, blockedAt: now } satisfies BlockedUserDoc);
    await cleanupRelationships(userId, targetId);
    return true;
  }
}

/**
 * ユーザーをブロックしているか確認
 */
export async function isBlocking(userId: string, targetId: string): Promise<boolean> {
  if (userId === targetId) return false;
  const ref = blockedUserDocRef(userId, targetId);
  const snap = await getDoc(ref);
  return snap.exists();
}

/**
 * 相手にブロックされているか確認
 */
export async function isBlockedBy(userId: string, blockerId: string): Promise<boolean> {
  if (userId === blockerId) return false;
  // blockerがuserIdをブロックしているか = isBlocking(blockerId, userId)
  const ref = blockedUserDocRef(blockerId, userId);
  const snap = await getDoc(ref);
  return snap.exists();
}

/**
 * どちらかがブロックしているか確認（双方向チェック）
 * タイムライン表示などで使用
 */
export async function isEitherBlocking(userIdA: string, userIdB: string): Promise<boolean> {
  if (userIdA === userIdB) return false;
  const [aBlocksB, bBlocksA] = await Promise.all([
    isBlocking(userIdA, userIdB),
    isBlocking(userIdB, userIdA),
  ]);
  return aBlocksB || bBlocksA;
}

/**
 * ユーザーがブロックしている全ユーザーIDを取得
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const ref = blockedUsersRef(userId);
  const snap = await getDocs(ref);
  const ids: string[] = [];
  snap.forEach((doc) => {
    ids.push(doc.id);
  });
  return ids;
}

/**
 * ユーザーにブロックされている全ユーザーIDを取得
 * 注意: 全ユーザーをスキャンするため、パフォーマンスに注意
 * 通常はisBlocking/isEitherBlockingを使用
 */
export async function getBlockedByUserIds(targetId: string): Promise<string[]> {
  // サブコレクションをまたいだクエリは直接できないため、
  // この機能は必要に応じてCloud Functionsで実装するか、
  // アルバム閲覧時に個別チェックする方式を推奨
  // ここでは空配列を返す（将来の拡張用）
  console.warn('getBlockedByUserIds is not fully implemented - use isBlocking for individual checks');
  return [];
}

/**
 * ブロック時の副作用処理
 * フレンド関係・ウォッチ・申請を双方向で解除
 */
async function cleanupRelationships(userId: string, targetId: string): Promise<void> {
  try {
    // フレンド関係の解除（双方向）
    const friendIdForward = `${userId}_${targetId}`;
    const friendIdBackward = `${targetId}_${userId}`;
    const friendRefF = doc(db, COL.friends, friendIdForward);
    const friendRefB = doc(db, COL.friends, friendIdBackward);
    
    const [friendSnapF, friendSnapB] = await Promise.all([
      getDoc(friendRefF),
      getDoc(friendRefB),
    ]);
    
    const deletePromises: Promise<void>[] = [];
    if (friendSnapF.exists()) {
      deletePromises.push(deleteDoc(friendRefF));
    }
    if (friendSnapB.exists()) {
      deletePromises.push(deleteDoc(friendRefB));
    }

    // ウォッチ関係の解除（双方向）
    const watchIdForward = `${userId}_${targetId}`;
    const watchIdBackward = `${targetId}_${userId}`;
    const watchRefF = doc(db, COL.watches, watchIdForward);
    const watchRefB = doc(db, COL.watches, watchIdBackward);
    
    const [watchSnapF, watchSnapB] = await Promise.all([
      getDoc(watchRefF),
      getDoc(watchRefB),
    ]);
    
    if (watchSnapF.exists()) {
      deletePromises.push(deleteDoc(watchRefF));
    }
    if (watchSnapB.exists()) {
      deletePromises.push(deleteDoc(watchRefB));
    }

    await Promise.all(deletePromises);
  } catch (e) {
    // 副作用の失敗はブロック自体を失敗させない
    console.error('cleanupRelationships error:', e);
  }
}

/**
 * 指定したユーザーIDリストからブロック中のユーザーを除外
 * タイムラインや検索結果のフィルタリングに使用
 */
export async function filterOutBlocked(userId: string, targetIds: string[]): Promise<string[]> {
  if (targetIds.length === 0) return [];
  
  const blockedIds = await getBlockedUserIds(userId);
  const blockedSet = new Set(blockedIds);
  
  return targetIds.filter((id) => !blockedSet.has(id));
}

/**
 * 指定したユーザーIDリストから自分をブロックしているユーザーを除外
 * アルバム閲覧者リストなどで使用
 */
export async function filterOutBlockedBy(userId: string, potentialBlockerIds: string[]): Promise<string[]> {
  if (potentialBlockerIds.length === 0) return [];
  
  const results = await Promise.all(
    potentialBlockerIds.map(async (blockerId) => {
      const blocks = await isBlocking(blockerId, userId);
      return blocks ? null : blockerId;
    })
  );
  
  return results.filter((id): id is string => id !== null);
}

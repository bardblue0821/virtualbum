/**
 * ミュート機能のリポジトリ
 * 
 * ユーザーのミュート/解除、ミュート状態の取得を担当
 * ブロックと異なり、関係性の解除は行わない
 */

import { db } from '@/lib/firebase';
import { COL } from '@/lib/paths';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs,
} from 'firebase/firestore';
import type { MutedUserDoc } from '@/lib/types/firestore';
import { ErrorHelpers } from '@/lib/errors';

/**
 * ミュート済みユーザーのサブコレクション参照を取得
 */
function mutedUsersRef(userId: string) {
  return collection(db, COL.users, userId, COL.mutedUsers);
}

/**
 * ミュート済みユーザードキュメントの参照を取得
 */
function mutedUserDocRef(userId: string, mutedId: string) {
  return doc(db, COL.users, userId, COL.mutedUsers, mutedId);
}

/**
 * ユーザーをミュートする
 */
export async function muteUser(userId: string, targetId: string): Promise<void> {
  if (userId === targetId) {
    throw ErrorHelpers.selfOperation('ミュート');
  }

  const ref = mutedUserDocRef(userId, targetId);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    throw ErrorHelpers.duplicate('ミュート');
  }

  // ミュート実行
  const now = new Date();
  await setDoc(ref, { id: targetId, mutedAt: now } satisfies MutedUserDoc);
}

/**
 * ミュートを解除する
 */
export async function unmuteUser(userId: string, targetId: string): Promise<void> {
  if (userId === targetId) {
    throw ErrorHelpers.selfOperation('ミュート解除');
  }

  const ref = mutedUserDocRef(userId, targetId);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    throw ErrorHelpers.notFound('ミュート');
  }

  await deleteDoc(ref);
}

/**
 * ミュート状態をトグルする
 * @returns 新しいミュート状態 (true: ミュート中, false: 解除)
 */
export async function toggleMute(userId: string, targetId: string): Promise<boolean> {
  if (userId === targetId) {
    throw ErrorHelpers.selfOperation('ミュート');
  }

  const ref = mutedUserDocRef(userId, targetId);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    // 解除
    await deleteDoc(ref);
    return false;
  } else {
    // ミュート
    const now = new Date();
    await setDoc(ref, { id: targetId, mutedAt: now } satisfies MutedUserDoc);
    return true;
  }
}

/**
 * ユーザーをミュートしているか確認
 */
export async function isMuting(userId: string, targetId: string): Promise<boolean> {
  if (userId === targetId) return false;
  const ref = mutedUserDocRef(userId, targetId);
  const snap = await getDoc(ref);
  return snap.exists();
}

/**
 * ユーザーがミュートしている全ユーザーIDを取得
 */
export async function getMutedUserIds(userId: string): Promise<string[]> {
  const ref = mutedUsersRef(userId);
  const snap = await getDocs(ref);
  return snap.docs.map(d => d.id);
}

/**
 * ミュート中のユーザーをフィルタリング
 * @param items フィルタ対象の配列
 * @param mutedIds ミュート中のユーザーIDリスト
 * @param userIdKey ユーザーIDを取得するキー
 */
export function filterOutMuted<T extends Record<string, any>>(
  items: T[],
  mutedIds: string[],
  userIdKey: keyof T
): T[] {
  if (mutedIds.length === 0) return items;
  const mutedSet = new Set(mutedIds);
  return items.filter(item => !mutedSet.has(item[userIdKey] as string));
}

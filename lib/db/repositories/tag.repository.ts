/**
 * タグ関連のリポジトリ
 * - ユーザータグ：ユーザーが自分自身に付けるタグ（最大5つ）
 * - アルバムタグ：アルバムオーナーがアルバムに付けるタグ（最大5つ）
 */

import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from 'firebase/firestore';
import { COL } from '@/lib/paths';

// タグのバリデーション
const TAG_MAX_LENGTH = 10;
const TAG_MAX_COUNT = 5;
const TAG_PATTERN = /^[a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/; // 英数字、アンダーバー、日本語

export interface TagValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTag(tag: string): TagValidationResult {
  if (!tag || tag.trim().length === 0) {
    return { valid: false, error: 'タグは空にできません' };
  }
  
  const trimmed = tag.trim();
  
  if (trimmed.length > TAG_MAX_LENGTH) {
    return { valid: false, error: `タグは${TAG_MAX_LENGTH}文字以内にしてください` };
  }
  
  if (!TAG_PATTERN.test(trimmed)) {
    return { valid: false, error: 'タグは日本語・英数字・アンダーバーのみ使用できます' };
  }
  
  if (trimmed.includes(' ') || trimmed.includes('　')) {
    return { valid: false, error: 'タグに空白は使用できません' };
  }
  
  return { valid: true };
}

export function validateTags(tags: string[]): TagValidationResult {
  if (tags.length > TAG_MAX_COUNT) {
    return { valid: false, error: `タグは最大${TAG_MAX_COUNT}個までです` };
  }
  
  for (const tag of tags) {
    const result = validateTag(tag);
    if (!result.valid) return result;
  }
  
  return { valid: true };
}

// ==================== ユーザータグ ====================

/**
 * ユーザーのタグを取得
 */
export async function getUserTags(userId: string): Promise<string[]> {
  const userRef = doc(db, COL.users, userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return [];
  const data = snap.data();
  return Array.isArray(data.tags) ? data.tags : [];
}

/**
 * ユーザーのタグを更新
 */
export async function updateUserTags(userId: string, tags: string[]): Promise<void> {
  const validation = validateTags(tags);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const userRef = doc(db, COL.users, userId);
  await updateDoc(userRef, { tags });
}

/**
 * タグでユーザーを検索
 */
export async function searchUsersByTag(
  tag: string,
  limitCount = 20
): Promise<Array<{ uid: string; displayName: string; handle: string | null; iconURL: string | null; tags: string[] }>> {
  try {
    const q = query(
      collection(db, COL.users),
      where('tags', 'array-contains', tag),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || '',
        handle: data.handle || null,
        iconURL: data.iconURL || null,
        tags: Array.isArray(data.tags) ? data.tags : [],
      };
    });
  } catch (e: any) {
    // FAILED_PRECONDITION (インデックス不足) の場合は空配列を返す
    const msg = String(e?.code || e?.message || '');
    if (msg.includes('failed-precondition') || msg.toLowerCase().includes('index')) {
      console.warn('searchUsersByTag: index not ready, returning empty', e);
      return [];
    }
    throw e;
  }
}

// ==================== アルバムタグ ====================

/**
 * アルバムのタグを取得
 */
export async function getAlbumTags(albumId: string): Promise<string[]> {
  const albumRef = doc(db, COL.albums, albumId);
  const snap = await getDoc(albumRef);
  if (!snap.exists()) return [];
  const data = snap.data();
  return Array.isArray(data.tags) ? data.tags : [];
}

/**
 * アルバムのタグを更新（オーナーのみ）
 */
export async function updateAlbumTags(
  albumId: string,
  tags: string[],
  userId: string
): Promise<void> {
  const validation = validateTags(tags);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const albumRef = doc(db, COL.albums, albumId);
  const snap = await getDoc(albumRef);
  if (!snap.exists()) {
    throw new Error('ALBUM_NOT_FOUND');
  }
  
  const data = snap.data();
  if (data.ownerId !== userId) {
    throw new Error('NO_PERMISSION');
  }
  
  await updateDoc(albumRef, { tags });
}

/**
 * タグでアルバムを検索
 */
export async function searchAlbumsByTag(
  tag: string,
  limitCount = 20
): Promise<Array<{ id: string; title: string; ownerId: string; coverImageURL: string | null; tags: string[] }>> {
  try {
    const q = query(
      collection(db, COL.albums),
      where('tags', 'array-contains', tag),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || '',
        ownerId: data.ownerId || '',
        coverImageURL: data.coverImageURL || null,
        tags: Array.isArray(data.tags) ? data.tags : [],
      };
    });
  } catch (e: any) {
    // FAILED_PRECONDITION (インデックス不足) の場合は空配列を返す
    const msg = String(e?.code || e?.message || '');
    if (msg.includes('failed-precondition') || msg.toLowerCase().includes('index')) {
      console.warn('searchAlbumsByTag: index not ready, returning empty', e);
      return [];
    }
    throw e;
  }
}

/**
 * タグでアルバムを検索（リッチ版：オーナー情報・最初の画像URLを含む）
 */
export async function searchAlbumsByTagRich(
  tag: string,
  limitCount = 20
): Promise<Array<{
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerHandle: string | null;
  ownerIconURL: string | null;
  coverImageURL: string | null;
  firstImageUrl: string | null;
  tags: string[];
  createdAt: any;
}>> {
  let snap;
  try {
    const q = query(
      collection(db, COL.albums),
      where('tags', 'array-contains', tag),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    snap = await getDocs(q);
  } catch (e: any) {
    // FAILED_PRECONDITION (インデックス不足) の場合は空配列を返す
    const msg = String(e?.code || e?.message || '');
    if (msg.includes('failed-precondition') || msg.toLowerCase().includes('index')) {
      console.warn('searchAlbumsByTagRich: index not ready, returning empty', e);
      return [];
    }
    throw e;
  }
  
  // オーナー情報をバッチ取得
  const ownerIds = new Set(snap.docs.map(d => d.data().ownerId).filter(Boolean));
  const ownerMap: Record<string, { displayName: string; handle: string | null; iconURL: string | null }> = {};
  
  await Promise.all(
    Array.from(ownerIds).map(async (uid) => {
      try {
        const userRef = doc(db, COL.users, uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          ownerMap[uid] = {
            displayName: userData.displayName || '',
            handle: userData.handle || null,
            iconURL: userData.iconURL || null,
          };
        }
      } catch {}
    })
  );
  
  // 各アルバムの最初の画像を取得
  const albumFirstImages: Record<string, string | null> = {};
  await Promise.all(
    snap.docs.map(async (d) => {
      try {
        const imagesRef = collection(db, COL.albums, d.id, 'images');
        const imagesSnap = await getDocs(query(imagesRef, orderBy('createdAt', 'asc'), limit(1)));
        if (imagesSnap.docs.length > 0) {
          const imgData = imagesSnap.docs[0].data();
          albumFirstImages[d.id] = imgData.thumbUrl || imgData.url || null;
        }
      } catch {}
    })
  );
  
  return snap.docs.map((d) => {
    const data = d.data();
    const owner = ownerMap[data.ownerId] || { displayName: '', handle: null, iconURL: null };
    return {
      id: d.id,
      title: data.title || '',
      ownerId: data.ownerId || '',
      ownerName: owner.displayName,
      ownerHandle: owner.handle,
      ownerIconURL: owner.iconURL,
      coverImageURL: data.coverImageURL || null,
      firstImageUrl: albumFirstImages[d.id] || data.coverImageURL || null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      createdAt: data.createdAt || null,
    };
  });
}

// ==================== タグ候補取得 ====================

/**
 * 全てのユニークなユーザータグを取得（候補表示用）
 */
export async function getAllUserTags(limitCount = 100): Promise<string[]> {
  const q = query(collection(db, COL.users), limit(limitCount));
  const snap = await getDocs(q);
  const tagSet = new Set<string>();
  snap.docs.forEach((d) => {
    const tags = d.data().tags;
    if (Array.isArray(tags)) {
      tags.forEach((t: string) => tagSet.add(t));
    }
  });
  return Array.from(tagSet);
}

/**
 * 全てのユニークなアルバムタグを取得（候補表示用）
 */
export async function getAllAlbumTags(limitCount = 100): Promise<string[]> {
  const q = query(collection(db, COL.albums), limit(limitCount));
  const snap = await getDocs(q);
  const tagSet = new Set<string>();
  snap.docs.forEach((d) => {
    const tags = d.data().tags;
    if (Array.isArray(tags)) {
      tags.forEach((t: string) => tagSet.add(t));
    }
  });
  return Array.from(tagSet);
}

/**
 * タグ候補をフィルタリング（部分一致）
 */
export function filterTagCandidates(candidates: string[], input: string): string[] {
  if (!input) return candidates.slice(0, 10);
  const lower = input.toLowerCase();
  return candidates
    .filter((c) => c.toLowerCase().includes(lower))
    .slice(0, 10);
}

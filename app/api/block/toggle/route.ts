/**
 * ブロック状態トグルAPI
 * POST /api/block/toggle
 * Body: { targetUserId: string }
 * Response: { blocked: boolean }
 */

export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/src/libs/firebaseAdmin';
import { COL } from '@/lib/paths';

// レート制限: 10回/60秒
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (b.count >= RATE_LIMIT_MAX) return false;
  b.count += 1;
  return true;
}

/**
 * Admin SDK でブロック状態をトグル
 */
async function toggleBlockAdmin(userId: string, targetId: string): Promise<boolean> {
  const db = getAdminDb();
  const blockedRef = db.collection(COL.users).doc(userId).collection(COL.blockedUsers).doc(targetId);
  const snap = await blockedRef.get();

  if (snap.exists) {
    // 解除
    await blockedRef.delete();
    return false;
  } else {
    // ブロック
    const now = new Date();
    await blockedRef.set({ id: targetId, blockedAt: now });
    // 副作用: フレンド関係・ウォッチ・申請を解除
    await cleanupRelationshipsAdmin(db, userId, targetId);
    return true;
  }
}

/**
 * Admin SDK でフレンド・ウォッチ・申請を双方向で解除
 */
async function cleanupRelationshipsAdmin(db: FirebaseFirestore.Firestore, userId: string, targetId: string): Promise<void> {
  const batch = db.batch();

  // フレンド関係 (両方向)
  const friendId1 = `${userId}_${targetId}`;
  const friendId2 = `${targetId}_${userId}`;
  batch.delete(db.collection(COL.friends).doc(friendId1));
  batch.delete(db.collection(COL.friends).doc(friendId2));

  // ウォッチ (両方向)
  const watchId1 = `${userId}_${targetId}`;
  const watchId2 = `${targetId}_${userId}`;
  batch.delete(db.collection(COL.watches).doc(watchId1));
  batch.delete(db.collection(COL.watches).doc(watchId2));

  await batch.commit();
}

export async function POST(req: NextRequest) {
  try {
    // レート制限
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(`block:${ip}`)) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }

    // リクエストボディ
    const json = await req.json().catch(() => null);
    const targetUserId = json?.targetUserId as string | undefined;
    if (!targetUserId) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'targetUserId is required' }, { status: 400 });
    }

    // 認証
    const auth = req.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const userId = decoded.uid;

    // 自分自身をブロックできない
    if (userId === targetUserId) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'Cannot block yourself' }, { status: 400 });
    }

    // ブロック状態をトグル（Admin SDK使用）
    const blocked = await toggleBlockAdmin(userId, targetUserId);

    return NextResponse.json({ blocked });
  } catch (e: any) {
    console.error('block/toggle error:', e);
    return NextResponse.json({ error: e?.message || 'UNKNOWN' }, { status: 500 });
  }
}

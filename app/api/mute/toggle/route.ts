/**
 * ミュート状態トグルAPI
 * POST /api/mute/toggle
 * Body: { targetUserId: string }
 * Response: { muted: boolean }
 */

export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/src/libs/firebaseAdmin';
import { COL } from '@/lib/paths';

// レート制限: 20回/60秒（ミュートはブロックより軽い操作なので緩め）
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
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
 * Admin SDK でミュート状態をトグル
 */
async function toggleMuteAdmin(userId: string, targetId: string): Promise<boolean> {
  const db = getAdminDb();
  const mutedRef = db.collection(COL.users).doc(userId).collection(COL.mutedUsers).doc(targetId);
  const snap = await mutedRef.get();

  if (snap.exists) {
    // 解除
    await mutedRef.delete();
    return false;
  } else {
    // ミュート
    const now = new Date();
    await mutedRef.set({ id: targetId, mutedAt: now });
    return true;
  }
}

export async function POST(req: NextRequest) {
  try {
    // レート制限
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(`mute:${ip}`)) {
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

    // 自分自身をミュートできない
    if (userId === targetUserId) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'Cannot mute yourself' }, { status: 400 });
    }

    // ミュート状態をトグル（Admin SDK使用）
    const muted = await toggleMuteAdmin(userId, targetUserId);

    return NextResponse.json({ muted });
  } catch (e: any) {
    console.error('mute/toggle error:', e);
    return NextResponse.json({ error: e?.message || 'UNKNOWN' }, { status: 500 });
  }
}

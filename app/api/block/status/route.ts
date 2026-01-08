/**
 * ブロック状態取得API
 * GET /api/block/status?targetUserId=xxx
 * Response: { blocked: boolean, blockedByThem: boolean }
 */

export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/src/libs/firebaseAdmin';
import { COL } from '@/lib/paths';

/**
 * Admin SDK でブロック状態を確認
 */
async function isBlockingAdmin(userId: string, targetId: string): Promise<boolean> {
  const db = getAdminDb();
  const blockedRef = db.collection(COL.users).doc(userId).collection(COL.blockedUsers).doc(targetId);
  const snap = await blockedRef.get();
  return snap.exists;
}

export async function GET(req: NextRequest) {
  try {
    // クエリパラメータ
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('targetUserId');
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

    // 自分自身の場合は常にfalse
    if (userId === targetUserId) {
      return NextResponse.json({ blocked: false, blockedByThem: false });
    }

    // ブロック状態を取得（Admin SDK使用）
    // blocked: 自分がtargetをブロックしているか
    // blockedByThem: targetが自分をブロックしているか
    const [blocked, blockedByThem] = await Promise.all([
      isBlockingAdmin(userId, targetUserId),
      isBlockingAdmin(targetUserId, userId),
    ]);

    return NextResponse.json({ blocked, blockedByThem });
  } catch (e: any) {
    console.error('block/status error:', e);
    return NextResponse.json({ error: e?.message || 'UNKNOWN' }, { status: 500 });
  }
}

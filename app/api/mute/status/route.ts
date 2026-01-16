/**
 * ミュート状態取得API
 * GET /api/mute/status?targetUserId=xxx
 * Response: { muted: boolean }
 */

export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebase/admin';
import { COL } from '@/lib/paths';

/**
 * Admin SDK でミュート状態を確認
 */
async function isMutingAdmin(userId: string, targetId: string): Promise<boolean> {
  const db = getAdminDb();
  const mutedRef = db.collection(COL.users).doc(userId).collection(COL.mutedUsers).doc(targetId);
  const snap = await mutedRef.get();
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
      return NextResponse.json({ muted: false });
    }

    // ミュート状態を取得（Admin SDK使用）
    const muted = await isMutingAdmin(userId, targetUserId);

    return NextResponse.json({ muted });
  } catch (e: any) {
    console.error('mute/status error:', e);
    return NextResponse.json({ error: e?.message || 'UNKNOWN' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { addComment } from '@/lib/db/repositories/comment.repository';
// TODO: Implement admin functions for better security
import { verifyIdToken } from '@/lib/firebase/admin';
import { isEitherBlocking } from '@/lib/db/repositories/block.repository';
import { getAlbum } from '@/lib/db/repositories/album.repository';

// very simple in-memory rate limit (per IP): 10 req / 60s
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const commentBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const b = commentBuckets.get(key);
  if (!b || now > b.resetAt) {
    commentBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (b.count >= RATE_LIMIT_MAX) return false;
  b.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(`comment:${ip}`)) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }
    const json = await req.json().catch(() => null);
    const albumId = json?.albumId as string | undefined;
    const userId = json?.userId as string | undefined;
    const body = (json?.body as string | undefined)?.trim();
    if (!albumId || !userId || !body) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    const auth = req.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('comments:add no token; allowing in dev');
      } else {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
      }
    }
    const decoded = token ? await verifyIdToken(token) : null;
    if (decoded && decoded.uid !== userId) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (body.length > 1000) {
      return NextResponse.json({ error: 'COMMENT_TOO_LONG' }, { status: 400 });
    }
    
    // ブロック判定: アルバムオーナーとコメント投稿者間でブロック関係がある場合は拒否
    const album = await getAlbum(albumId);
    if (album && album.ownerId !== userId) {
      const blocked = await isEitherBlocking(album.ownerId, userId);
      if (blocked) {
        return NextResponse.json({ error: 'BLOCKED', message: 'ブロックされているためコメントできません' }, { status: 403 });
      }
    }
    
    await addComment(albumId, userId, body);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[comments/add] Error:', e);
    const errorDetail = process.env.NODE_ENV !== 'production' ? e?.stack || e?.message : undefined;
    return NextResponse.json({ error: e?.message || 'UNKNOWN', detail: errorDetail }, { status: 500 });
  }
}

export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { canUploadMoreImages } from '@/lib/repos/imageRepo';
import { adminAddImage, adminGetFriendStatus } from '@/src/repositories/admin/firestore';
import { getAlbumSafe } from '@/lib/repos/albumRepo';
import { verifyIdToken } from '@/src/libs/firebaseAdmin';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:images:register');

// simple rate limit per IP: 20 req / 60s (higher than add endpoint due to batch uploads)
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
 * POST /api/images/register
 * 既に Storage にアップロード済みの画像を Firestore に登録する
 * AlbumImageUploader から呼ばれる
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(`image:register:${ip}`)) {
      log.warn('rate limited:', ip);
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }
    
    const auth = req.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      if (process.env.NODE_ENV !== 'production') {
        log.warn('no token; allowing in dev');
      } else {
        log.warn('unauthorized: no token');
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
      }
    }
    const decoded = token ? await verifyIdToken(token) : null;
    log.debug('decoded user:', decoded?.uid);

    const json = await req.json().catch(() => null);
    const albumId = json?.albumId as string | undefined;
    const userId = json?.userId as string | undefined;
    const url = json?.url as string | undefined;
    const thumbUrl = json?.thumbUrl as string | undefined;
    const alt = json?.alt as string | undefined;
    
    log.debug('request:', { albumId, userId, hasUrl: !!url, hasThumbUrl: !!thumbUrl, hasAlt: !!alt });
    
    if (!albumId || !userId || !url) {
      log.warn('invalid input:', { albumId, userId, hasUrl: !!url });
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    if (decoded && decoded.uid !== userId) {
      log.warn('forbidden: uid mismatch:', { decoded: decoded.uid, userId });
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // アルバムの存在と権限をチェック
    const album = await getAlbumSafe(albumId);
    if (!album) {
      log.warn('album not found:', albumId);
      return NextResponse.json({ error: 'ALBUM_NOT_FOUND' }, { status: 404 });
    }
    
    const isOwner = album.ownerId === userId;
    let isFriend = false;
    try {
      const [forward, backward] = await Promise.all([
        adminGetFriendStatus(userId, album.ownerId),
        adminGetFriendStatus(album.ownerId, userId),
      ]);
      isFriend = (forward === 'accepted') || (backward === 'accepted');
    } catch (e) {
      log.warn('friend status check failed:', e);
    }

    log.debug('permissions:', { 
      isOwner, 
      isFriend, 
      albumOwnerId: album.ownerId,
      userId,
      albumVisibility: album.visibility
    });

    if (!(isOwner || isFriend)) {
      log.warn('no permission:', {
        reason: 'not owner and not friend',
        isOwner,
        isFriend,
        userId,
        albumOwnerId: album.ownerId
      });
      return NextResponse.json({ error: 'NO_PERMISSION' }, { status: 403 });
    }

    // アップロード上限チェック
    const allow = await canUploadMoreImages(albumId, userId);
    if (!allow) {
      log.warn('limit exceeded');
      return NextResponse.json({ error: 'LIMIT_EXCEEDED' }, { status: 400 });
    }

    // Admin SDK で Firestore に登録
    log.debug('calling adminAddImage');
    await adminAddImage(albumId, userId, url, thumbUrl, alt);
    
    log.debug('success');
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'UNKNOWN';
    log.error('error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

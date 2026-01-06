/**
 * API Route 用ユーティリティ
 * 認証、レート制限、エラーハンドリングの共通処理
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyIdToken } from './firebaseAdmin';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:helpers');

// レート制限の設定
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 30;

// IP ごとのレート制限バケット
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * レート制限をチェック
 */
export function checkRateLimit(key: string, maxRequests: number = DEFAULT_RATE_LIMIT): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  
  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (bucket.count >= maxRequests) {
    return false;
  }
  
  bucket.count += 1;
  return true;
}

/**
 * リクエストから IP アドレスを取得
 */
export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

/**
 * 認証済みユーザーの型
 */
export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
}

/**
 * API レスポンスのヘルパー
 */
export const ApiResponse = {
  success: <T>(data: T, status: number = 200) => 
    NextResponse.json(data, { status }),
  
  error: (error: string, status: number = 400) => 
    NextResponse.json({ error }, { status }),
  
  unauthorized: (message: string = 'UNAUTHORIZED') => 
    NextResponse.json({ error: message }, { status: 401 }),
  
  forbidden: (message: string = 'FORBIDDEN') => 
    NextResponse.json({ error: message }, { status: 403 }),
  
  notFound: (message: string = 'NOT_FOUND') => 
    NextResponse.json({ error: message }, { status: 404 }),
  
  rateLimited: () => 
    NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 }),
  
  serverError: (message: string = 'INTERNAL_ERROR') => 
    NextResponse.json({ error: message }, { status: 500 }),
};

/**
 * 認証付き API ハンドラー
 * 
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   return withAuth(req, async (user, req) => {
 *     // user.uid で認証済みユーザーを参照可能
 *     return ApiResponse.success({ message: 'OK' });
 *   });
 * }
 * ```
 */
export async function withAuth(
  req: NextRequest,
  handler: (user: AuthenticatedUser, req: NextRequest) => Promise<NextResponse>,
  options?: {
    rateLimit?: number;
    rateLimitKey?: string;
  }
): Promise<NextResponse> {
  try {
    const ip = getClientIp(req);
    
    // レート制限チェック
    if (options?.rateLimit) {
      const key = options.rateLimitKey || `api:${ip}`;
      if (!checkRateLimit(key, options.rateLimit)) {
        log.warn('rate limited:', key);
        return ApiResponse.rateLimited();
      }
    }
    
    // 認証トークン取得
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      // 開発環境では警告のみ（テスト用）
      if (process.env.NODE_ENV !== 'production') {
        log.warn('no token in dev mode');
      }
      return ApiResponse.unauthorized('NO_TOKEN');
    }
    
    // トークン検証
    const decoded = await verifyIdToken(token);
    if (!decoded || !decoded.uid) {
      return ApiResponse.unauthorized('INVALID_TOKEN');
    }
    
    // ハンドラー実行
    return await handler(
      { uid: decoded.uid, email: decoded.email, name: decoded.name },
      req
    );
  } catch (error) {
    log.error('withAuth error:', error);
    return ApiResponse.serverError();
  }
}

/**
 * オプション認証付き API ハンドラー（認証は任意）
 */
export async function withOptionalAuth(
  req: NextRequest,
  handler: (user: AuthenticatedUser | null, req: NextRequest) => Promise<NextResponse>,
  options?: {
    rateLimit?: number;
    rateLimitKey?: string;
  }
): Promise<NextResponse> {
  try {
    const ip = getClientIp(req);
    
    // レート制限チェック
    if (options?.rateLimit) {
      const key = options.rateLimitKey || `api:${ip}`;
      if (!checkRateLimit(key, options.rateLimit)) {
        return ApiResponse.rateLimited();
      }
    }
    
    // 認証トークン取得（オプション）
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    let user: AuthenticatedUser | null = null;
    
    if (token) {
      const decoded = await verifyIdToken(token);
      if (decoded?.uid) {
        user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
      }
    }
    
    return await handler(user, req);
  } catch (error) {
    log.error('withOptionalAuth error:', error);
    return ApiResponse.serverError();
  }
}

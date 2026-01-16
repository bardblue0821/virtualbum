/**
 * TimelineItem 用ユーティリティ関数
 */
import type { FirestoreTimestamp } from './types';

/**
 * 任意の日時形式を Date に変換
 */
export function toDate(value: FirestoreTimestamp | Date | number | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'number') {
    return new Date(value > 1e12 ? value : value * 1000);
  }
  return null;
}

/**
 * 日時を表示用文字列にフォーマット
 */
export function formatDateTime(dt: Date | null): string {
  if (!dt) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

/**
 * テキストを指定文字数で切り詰め
 */
export function truncateText(text: string, maxLength: number = 30): string {
  const s = (text || '').toString();
  return s.length > maxLength ? s.slice(0, maxLength) + '…' : s;
}

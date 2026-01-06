/**
 * テストファクトリー - ヘルパー関数
 */

/**
 * ランダムな文字列を生成
 */
export function randomString(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * ランダムなIDを生成 (Firestore互換)
 */
export function randomId(): string {
  return randomString(20);
}

/**
 * 連番IDを生成
 */
export function sequentialId(prefix: string, index: number): string {
  return `${prefix}_${String(index).padStart(4, '0')}`;
}

/**
 * ランダムな日本語ユーザー名を生成
 */
export function randomJapaneseName(): string {
  const firstNames = ['太郎', '花子', '次郎', '美咲', '健太', '愛子', '翔太', 'さくら'];
  const lastNames = ['田中', '山田', '佐藤', '鈴木', '高橋', '伊藤', '渡辺', '中村'];
  return lastNames[Math.floor(Math.random() * lastNames.length)] + 
         firstNames[Math.floor(Math.random() * firstNames.length)];
}

/**
 * ランダムな英語ハンドルを生成
 */
export function randomHandle(): string {
  const prefixes = ['user', 'test', 'demo', 'dev', 'alice', 'bob', 'charlie'];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + '_' + randomString(4);
}

/**
 * ランダムなアルバムタイトルを生成
 */
export function randomAlbumTitle(): string {
  const places = ['渋谷', '新宿', '池袋', '秋葉原', 'VRChat', 'Cluster', 'NeosVR'];
  const events = ['オフ会', '誕生日会', '記念撮影', 'イベント', 'パーティー', '集合写真'];
  return places[Math.floor(Math.random() * places.length)] + 'の' + 
         events[Math.floor(Math.random() * events.length)];
}

/**
 * ランダムなコメント本文を生成
 */
export function randomCommentBody(): string {
  const comments = [
    'すごい！',
    'いい写真ですね！',
    'また参加したいです',
    '楽しそう！',
    'ナイスショット！',
    '懐かしい〜',
    '最高でした！',
    'ありがとうございます！',
  ];
  return comments[Math.floor(Math.random() * comments.length)];
}

/**
 * ランダムな絵文字リアクションを生成
 */
export function randomEmoji(): string {
  const emojis = ['❤️', '👍', '😊', '🎉', '🔥', '✨', '💯', '🙌', '😍', '👏'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * 過去のランダムな日付を生成
 */
export function randomPastDate(daysAgo: number = 365): Date {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return new Date(past);
}

/**
 * 配列からランダムに選択
 */
export function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 配列からランダムに複数選択
 */
export function randomPickMultiple<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * ダミー画像URLを生成 (placeholder)
 */
export function dummyImageUrl(width: number = 640, height: number = 480): string {
  return `https://picsum.photos/${width}/${height}?random=${randomString(6)}`;
}

/**
 * ダミーサムネイルURLを生成
 */
export function dummyThumbUrl(): string {
  return dummyImageUrl(200, 200);
}

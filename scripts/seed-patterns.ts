/**
 * シードデータのパターン定義
 * 
 * 各パターンは異なるユースケースをシミュレート:
 * - small: 開発中の簡易テスト
 * - medium: 一般的なテスト
 * - large: パフォーマンステスト
 * - stress: 負荷テスト
 * - social: ソーシャル機能重視
 * - albums: アルバム・画像重視
 * - fresh: 新規ユーザー中心
 * - active: アクティブユーザー中心
 */

// ==================== 設定インターフェース ====================

export interface SeedConfig {
  // ユーザー設定
  userCount: number;
  
  // アルバム設定
  albumsPerUser: { min: number; max: number };
  imagesPerAlbum: { min: number; max: number };
  
  // ソーシャル設定
  friendConnectionRate: number;  // 0-1: ユーザー間のフレンド接続率
  watchesPerUser: { min: number; max: number };
  
  // エンゲージメント設定
  likesPerAlbum: { min: number; max: number };
  commentsPerAlbum: { min: number; max: number };
  reactionsPerAlbum: { min: number; max: number };
  
  // 可視性設定
  publicAlbumRate: number;  // 0-1: 公開アルバムの割合
  
  // オプション
  includeEmptyUsers?: boolean;     // 投稿のないユーザーを含める
  includeInactiveUsers?: boolean;  // 古いアカウントを含める
  includeHeavyUsers?: boolean;     // 大量投稿ユーザーを含める
}

// ==================== パターン定義 ====================

export const SEED_PATTERNS: Record<string, SeedConfig> = {
  // 開発用: 最小限のデータ
  small: {
    userCount: 10,
    albumsPerUser: { min: 1, max: 3 },
    imagesPerAlbum: { min: 2, max: 5 },
    friendConnectionRate: 0.3,
    watchesPerUser: { min: 1, max: 3 },
    likesPerAlbum: { min: 1, max: 5 },
    commentsPerAlbum: { min: 0, max: 3 },
    reactionsPerAlbum: { min: 0, max: 3 },
    publicAlbumRate: 0.7,
  },

  // 一般テスト用
  medium: {
    userCount: 50,
    albumsPerUser: { min: 2, max: 5 },
    imagesPerAlbum: { min: 3, max: 10 },
    friendConnectionRate: 0.15,
    watchesPerUser: { min: 2, max: 8 },
    likesPerAlbum: { min: 2, max: 15 },
    commentsPerAlbum: { min: 1, max: 5 },
    reactionsPerAlbum: { min: 1, max: 8 },
    publicAlbumRate: 0.6,
    includeEmptyUsers: true,
  },

  // パフォーマンステスト用
  large: {
    userCount: 200,
    albumsPerUser: { min: 3, max: 8 },
    imagesPerAlbum: { min: 5, max: 15 },
    friendConnectionRate: 0.05,
    watchesPerUser: { min: 5, max: 20 },
    likesPerAlbum: { min: 5, max: 30 },
    commentsPerAlbum: { min: 2, max: 10 },
    reactionsPerAlbum: { min: 2, max: 15 },
    publicAlbumRate: 0.5,
    includeEmptyUsers: true,
    includeHeavyUsers: true,
  },

  // 負荷テスト用
  stress: {
    userCount: 500,
    albumsPerUser: { min: 5, max: 15 },
    imagesPerAlbum: { min: 10, max: 30 },
    friendConnectionRate: 0.02,
    watchesPerUser: { min: 10, max: 50 },
    likesPerAlbum: { min: 10, max: 50 },
    commentsPerAlbum: { min: 5, max: 20 },
    reactionsPerAlbum: { min: 5, max: 25 },
    publicAlbumRate: 0.4,
    includeEmptyUsers: true,
    includeInactiveUsers: true,
    includeHeavyUsers: true,
  },

  // ソーシャル機能テスト用（フレンド・ウォッチ重視）
  social: {
    userCount: 100,
    albumsPerUser: { min: 1, max: 3 },
    imagesPerAlbum: { min: 2, max: 5 },
    friendConnectionRate: 0.25,
    watchesPerUser: { min: 10, max: 30 },
    likesPerAlbum: { min: 5, max: 20 },
    commentsPerAlbum: { min: 3, max: 10 },
    reactionsPerAlbum: { min: 3, max: 12 },
    publicAlbumRate: 0.4,  // フレンド限定多め
  },

  // アルバム・画像テスト用（コンテンツ重視）
  albums: {
    userCount: 30,
    albumsPerUser: { min: 5, max: 15 },
    imagesPerAlbum: { min: 10, max: 25 },
    friendConnectionRate: 0.1,
    watchesPerUser: { min: 2, max: 5 },
    likesPerAlbum: { min: 3, max: 10 },
    commentsPerAlbum: { min: 1, max: 3 },
    reactionsPerAlbum: { min: 1, max: 5 },
    publicAlbumRate: 0.8,
  },

  // 新規ユーザー中心（ほぼ空のデータ）
  fresh: {
    userCount: 50,
    albumsPerUser: { min: 0, max: 2 },
    imagesPerAlbum: { min: 1, max: 3 },
    friendConnectionRate: 0.05,
    watchesPerUser: { min: 0, max: 2 },
    likesPerAlbum: { min: 0, max: 3 },
    commentsPerAlbum: { min: 0, max: 1 },
    reactionsPerAlbum: { min: 0, max: 2 },
    publicAlbumRate: 0.9,
    includeEmptyUsers: true,
  },

  // アクティブユーザー中心（エンゲージメント高め）
  active: {
    userCount: 30,
    albumsPerUser: { min: 3, max: 8 },
    imagesPerAlbum: { min: 5, max: 12 },
    friendConnectionRate: 0.4,
    watchesPerUser: { min: 5, max: 15 },
    likesPerAlbum: { min: 10, max: 30 },
    commentsPerAlbum: { min: 5, max: 15 },
    reactionsPerAlbum: { min: 5, max: 20 },
    publicAlbumRate: 0.6,
  },
};

// ==================== 名前データ ====================

export const NAMES = {
  firstNames: [
    '太郎', '花子', '次郎', '美咲', '健太', '愛子', '翔太', 'さくら', '大輔', '真由',
    '隆', '由美', '誠', '恵', '浩', '裕子', '和也', '優子', '達也', '明美',
    '拓也', '麻衣', '雄太', '彩', '直樹', '沙織', '健一', '千尋', '亮', '萌',
    '慎太郎', 'ひかり', '勇気', '瑠璃', '悠人', '凛', '蓮', '結衣', '陽翔', '咲良',
  ],
  lastNames: [
    '田中', '山田', '佐藤', '鈴木', '高橋', '伊藤', '渡辺', '中村', '小林', '加藤',
    '吉田', '山本', '松本', '井上', '木村', '林', '斎藤', '清水', '山口', '阿部',
    '池田', '橋本', '石川', '前田', '藤田', '小川', '岡田', '後藤', '長谷川', '村上',
  ],
};

// ==================== アルバムタイトルパターン ====================

export const ALBUM_TITLES = {
  // イベント系（普通の長さ）
  events: [
    'VRChat集会', '渋谷オフ会', '誕生日パーティー', 'クリスマスイベント',
    '新年会', '花見', '夏祭り', '忘年会', 'ハロウィンパーティー',
    '歓迎会', '送別会', 'BBQ大会', '運動会', '文化祭', '音楽ライブ',
  ],
  trips: [
    '京都旅行', '沖縄の思い出', '北海道ツアー', '温泉旅行', '海外旅行',
    'キャンプ', '登山', 'ドライブ', '電車の旅', '離島巡り',
  ],
  daily: [
    '日常スナップ', 'カフェ巡り', 'グルメ記録', 'ペットの写真',
    '料理の記録', 'ガーデニング', '手作り作品', 'お気に入りの場所',
  ],
  hobbies: [
    'ゲーム配信記録', 'イラスト制作', 'コスプレ写真', 'ライブ参戦',
    'アニメ聖地巡礼', 'フィギュア撮影', '模型制作', 'DIYプロジェクト',
  ],
  vr: [
    'VRChatワールド巡り', 'VR集合写真', 'アバター撮影会', 'VRイベント',
    'ワールド制作記録', 'VR建築', 'Quest生活', 'VR日記',
  ],
  // 短いタイトル（1-5文字）
  short: [
    '旅', '日常', '猫', '犬', '花', '空', '海', '山', '夜', '朝',
    '春', '夏', '秋', '冬', '食', '酒', '仕事', '趣味', 'VR', '写真',
  ],
  // 長いタイトル（30-50文字）
  long: [
    '2025年夏のVRChat大規模イベント集合写真まとめ',
    '友達と行った京都旅行3泊4日の思い出アルバム',
    '毎日撮り続けた愛犬の成長記録（生後1ヶ月〜1歳）',
    'コミケ参加レポート：買ったものと会場の様子',
    'クリスマスから年末年始にかけてのイベント写真集',
  ],
  // 非常に長いタイトル（50-100文字 - 上限ギリギリ）
  veryLong: [
    '2025年8月に開催されたVRChat最大級の夏フェスイベントに参加してきた時の写真をまとめました！最高の思い出！',
    '大学の友人たちと計画した北海道周遊旅行の全記録〜札幌・小樽・富良野・旭川を巡る5泊6日の大冒険〜',
  ],
  // 絵文字のみ
  emojiOnly: [
    '🎉', '✨📸', '🐱🐱🐱', '🌸🌸', '🎮🎮🎮', '❤️', '🌟', '🔥🔥',
  ],
  // 絵文字付き
  withEmoji: [
    '夏の思い出 🌻☀️',
    'VRChat集会 ✨',
    '誕生日パーティー 🎂🎉',
    'ペットの写真集 🐱🐶',
    '旅行記録 ✈️🗺️',
    'カフェ巡り ☕🍰',
  ],
  // 特殊文字
  special: [
    '【重要】イベント写真',
    '★☆★ベストショット★☆★',
    '〜思い出の一枚〜',
    '《公式》イベント記録',
    '※非公開※テスト用',
    '【Vol.1】シリーズ物',
  ],
  // 数字・記号多め
  numbersAndSymbols: [
    '2025/01/01 初日の出',
    'Day1〜Day7 旅行記録',
    '#VRChat #集合写真',
    'ver.2.0 アップデート記念',
    '100枚記念！',
  ],
};

// ==================== コメントパターン ====================

export const COMMENTS = {
  // 短いコメント（1-5文字）
  short: [
    '！', 'w', '草', '神', '良', '好', 'すこ', 'いい', 'ｗ', '♡',
  ],
  // 通常コメント（6-30文字）
  positive: [
    'すごい！', 'いい写真！', 'また参加したい', '楽しそう！', 'ナイスショット！',
    '最高！', '素敵✨', 'めっちゃいい！', '羨ましい〜', 'これ好き！',
    '雰囲気いいね', 'また誘ってね！', '次も参加する！', '保存した！', 'シェアしていい？',
  ],
  questions: [
    'これどこ？', 'いつの写真？', '何で撮った？', '加工アプリ何使ってる？',
    '次いつやるの？', '参加費いくら？', '何人くらいいた？',
  ],
  reactions: [
    'www', '草', 'ｗｗｗ', '笑った', 'わろた',
    'エモい', 'エモすぎる', 'やばい', 'すこ', 'しゅき',
  ],
  // 中程度のコメント（30-100文字）
  detailed: [
    'この構図好きだな〜',
    '光の入り方がいい感じ',
    '色味がめっちゃ綺麗',
    'この場所行ってみたい！',
    '雰囲気出てるね〜',
    '楽しそうで何より！',
    'こういう集まりいいよね',
    '次こそ参加したい...',
    'めっちゃ楽しかったです！また誘ってください🙏',
    'この日のこと思い出すと懐かしくなる〜',
    '写真見てたらまた行きたくなってきた！',
  ],
  // 長いコメント（100-300文字）
  long: [
    'この写真めっちゃいいですね！構図も光の入り方も完璧だと思います。自分もこういう写真撮れるようになりたいな〜。今度撮影テクニック教えてください！',
    'うわー！めっちゃ楽しそう！自分も参加したかった...次回は絶対に参加するので誘ってください！スケジュール空けて待ってます！よろしくお願いします！',
    'この日のイベント本当に楽しかったです！みんなで集まれて良かった。また同じメンバーで集まりたいですね。次は何やる？企画あったら教えてください！',
    'この場所すごくいいですね。今度行ってみたいのですが、アクセスとか教えてもらえますか？あと、おすすめの時間帯とかあれば知りたいです！',
  ],
  // 非常に長いコメント（300-500文字 - 上限ギリギリ）
  veryLong: [
    'この写真を見て色々思い出しました。あの日は天気も良くて、みんなで朝から集合して、最初は緊張してたけどだんだん打ち解けてきて、午後にはすっかり仲良くなってましたよね。帰りの電車でも話が尽きなくて、気づいたら終電ギリギリになってた笑。本当に楽しい一日でした。また同じメンバーで集まりたいですね！次は泊まりで行きませんか？計画立てましょう！',
    'VRChatのイベント、最高でした！ワールドの作り込みがすごくて、細部まで見て回るのに時間が足りなかったです。パフォーマンスも素晴らしかったし、参加者のアバターもみんな個性的で見てるだけで楽しかった。運営の方々も大変だったと思いますが、おかげで最高の体験ができました。本当にありがとうございました！次回も絶対参加します！',
  ],
  // 絵文字のみ
  emojiOnly: [
    '😊', '❤️', '🎉', '✨', '🔥', '👏👏👏', '😍😍', '🥳🎊', '💯💯💯',
    '❤️🧡💛💚💙💜', '✨✨✨', '🙌🙌', '💕💕💕', '😆😆😆',
  ],
  // 特殊文字・記号を含む
  special: [
    'すごい!!!',
    'えー!?マジで!?',
    '良い〜〜〜',
    'ﾜﾛﾀwwwwwwww',
    '（笑）（笑）（笑）',
    '神神神神神',
    '★★★★★',
    '→これ最高←',
    '｜壁｜･ω･`)ﾉ',
    '(((o(*ﾟ▽ﾟ*)o)))',
  ],
  // 改行を含む
  multiLine: [
    'すごくいい写真！\nまた参加したいです',
    '楽しかった〜！\n\nまた誘ってね',
    '最高でした！\n次回も楽しみにしてます\nよろしく！',
  ],
  // URLを含む
  withUrl: [
    '関連ツイート見て！ https://twitter.com/example/status/123',
    '詳細はこちら → https://example.com/event',
  ],
  // メンション風
  withMention: [
    '@user_0001 さんの写真最高！',
    'さんありがとう！',
    '@everyone おつかれ！',
  ],
};

// ==================== 絵文字リアクション ====================

export const REACTIONS = {
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💝'],
  faces: ['😊', '😍', '🥰', '😆', '🤣', '😎', '🥳', '🤩', '😇', '🙌'],
  symbols: ['✨', '🔥', '💯', '⭐', '🌟', '💫', '🎉', '🎊', '👏', '💪'],
  animals: ['🐱', '🐶', '🦊', '🐰', '🐼', '🐨', '🦁', '🐯', '🐸', '🦋'],
  misc: ['👍', '👌', '🙏', '💕', '🌈', '🌸', '🍀', '🎵', '📸', '🎨'],
};

// ==================== Bio テンプレート ====================

export const BIO_TEMPLATES = {
  // 空・極短（0-10文字）
  empty: [
    '',
    '.',
    '...',
    '-',
    '🐱',
    'Hello',
  ],
  // 短い（10-30文字）
  short: [
    'テストユーザー #{number}',
    'VRChat民 / 写真好き',
    '📸 カメラマン見習い',
    '🎮 ゲーム好き / 🎨 お絵描き',
    'よろしくお願いします！',
    'フォロー気軽にどうぞ〜',
    '写真撮るの好き / VR住民',
    '毎日楽しく過ごしてます',
    'イベント参加多め！',
    '旅行とカフェ巡りが趣味',
    '犬派 🐶',
    '猫派 🐱',
    'VRC: {handle}',
    '無言フォロー失礼します',
    '社会人 / 週末フォトグラファー',
    '学生 / 趣味垢',
    '創作活動中 🎨',
    'ゲーム実況見るのが好き',
    '音楽とアニメ好き 🎵',
    'まったり活動中',
  ],
  // 中程度（30-100文字）
  medium: [
    'VRChatで写真撮ってます！イベント参加多めです。お気軽にフォローどうぞ 📸',
    'ゲームと写真が趣味の社会人です。休日はVRChatかカメラ持って外出してます',
    '写真撮るのが好きな大学生です！旅行・カフェ・ペットの写真をよく撮ります 🐱',
    'イラスト描いたり写真撮ったり。創作活動してます。お仕事依頼はDMまで ✨',
  ],
  // 長い（100-200文字 - 上限付近）
  long: [
    'VRChatを中心に活動しています！毎週末のイベントには大体参加してます。写真撮るのが好きで、撮った写真はここにアップしていきます。同じ趣味の方、気軽にフォローしてください！一緒にイベント参加しましょう〜 🎉',
    '社会人3年目のカメラ好きです。休日はカメラ持って街歩きしたり、VRChatでイベント参加したりしてます。最近は動画編集にも興味があります。いいね・コメント・フォロー大歓迎です！よろしくお願いします 📸✨',
  ],
  // 絵文字多め
  emojiHeavy: [
    '✨📸🎮🎨✨',
    '🐱猫好き🐱写真好き🐱VR好き🐱',
    '🌸🌸🌸 お花見大好き 🌸🌸🌸',
    '🎉イベント参加！🎉写真撮影！🎉仲間募集！🎉',
  ],
  // 特殊文字
  special: [
    '【公式】テストアカウント',
    '★☆★ VRChat民 ★☆★',
    '〜ゆるく活動中〜',
    '《写真垢》メイン→@xxx',
    '▶︎ VRC ▶︎ 写真 ▶︎ ゲーム',
  ],
  // URL含む
  withUrl: [
    'メインアカウント: twitter.com/example',
    'ポートフォリオ: https://example.com',
    'BOOTH: xxx.booth.pm',
  ],
  // 改行含む
  multiLine: [
    'VRChat民\n写真撮ってます\nお気軽にフォローどうぞ',
    '趣味：ゲーム/写真/旅行\n\n無言フォロー失礼します',
  ],
};

// ==================== ヘルパー関数 ====================

export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomPickMultiple<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

export function randomPastDate(daysAgo: number = 365): Date {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return new Date(past);
}

export function randomString(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateAlbumTitle(): string {
  const categories = Object.values(ALBUM_TITLES);
  const category = randomPick(categories);
  const base = randomPick(category);
  
  // 短いタイトルや絵文字のみの場合はそのまま返す
  if (base.length <= 5 || /^[\u{1F300}-\u{1F9FF}]+$/u.test(base)) {
    return base;
  }
  
  // 長いタイトルはそのまま返す
  if (base.length > 30) {
    return base;
  }
  
  // 20% の確率で日付やサフィックスを追加
  if (Math.random() < 0.2) {
    const suffixes = ['2025', '2024', '第1回', '第2回', 'vol.1', 'vol.2', '前編', '後編', '完結'];
    return `${base} ${randomPick(suffixes)}`;
  }
  
  return base;
}

export function generateComment(): string {
  // 全カテゴリからランダムに選択（重み付け）
  const weights: [string[], number][] = [
    [COMMENTS.short, 10],
    [COMMENTS.positive, 25],
    [COMMENTS.questions, 10],
    [COMMENTS.reactions, 15],
    [COMMENTS.detailed, 15],
    [COMMENTS.long, 8],
    [COMMENTS.veryLong, 3],
    [COMMENTS.emojiOnly, 5],
    [COMMENTS.special, 5],
    [COMMENTS.multiLine, 2],
    [COMMENTS.withUrl, 1],
    [COMMENTS.withMention, 1],
  ];
  
  const totalWeight = weights.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (const [category, weight] of weights) {
    random -= weight;
    if (random <= 0) {
      return randomPick(category);
    }
  }
  
  return randomPick(COMMENTS.positive);
}

export function generateReaction(): string {
  const allReactions = [
    ...REACTIONS.hearts,
    ...REACTIONS.faces,
    ...REACTIONS.symbols,
  ];
  return randomPick(allReactions);
}

export function generateBio(number: number, handle: string): string {
  // ランダムにカテゴリを選択してからテンプレートを選択
  const categories = Object.values(BIO_TEMPLATES);
  const category = randomPick(categories);
  const template = randomPick(category);
  return template
    .replace('{number}', String(number))
    .replace('{handle}', handle);
}

export function generateDisplayName(): string {
  return randomPick(NAMES.lastNames) + randomPick(NAMES.firstNames);
}

// ==================== パターン一覧表示 ====================

export function listPatterns(): void {
  console.log('\n📋 利用可能なシードパターン:\n');
  
  const patterns = Object.entries(SEED_PATTERNS);
  
  for (const [name, config] of patterns) {
    const albumMin = config.albumsPerUser.min * config.userCount;
    const albumMax = config.albumsPerUser.max * config.userCount;
    const imageMin = albumMin * config.imagesPerAlbum.min;
    const imageMax = albumMax * config.imagesPerAlbum.max;
    
    console.log(`  ${name.padEnd(10)} - ${config.userCount} users, ~${albumMin}-${albumMax} albums, ~${imageMin}-${imageMax} images`);
  }
  
  console.log('\n使用方法: npm run seed:<pattern>');
  console.log('例: npm run seed:medium');
}

// CLI で直接実行された場合
if (require.main === module) {
  listPatterns();
}

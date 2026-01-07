/**
 * エミュレータ用シードスクリプト
 * 大量のテストデータをエミュレータに投入
 * 
 * Firebase Admin SDK を使用してセキュリティルールをバイパス
 * 
 * 使用方法:
 *   npm run seed:small   - 10ユーザー、20アルバム
 *   npm run seed:medium  - 50ユーザー、150アルバム
 *   npm run seed:large   - 100ユーザー、300アルバム
 *   npm run seed:reset   - 全データ削除
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// エミュレータ設定
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Firebase Admin 初期化 (エミュレータ用)
if (getApps().length === 0) {
  initializeApp({
    projectId: 'instavram3',
  });
}

const db = getFirestore();

// シード設定
interface SeedConfig {
  userCount: number;
  albumsPerUser: number;
  imagesPerAlbum: number;
  friendConnectionRate: number;
  watchesPerUser: number;
  likesPerAlbum: number;
  commentsPerAlbum: number;
  reactionsPerAlbum: number;
}

const CONFIGS: Record<string, SeedConfig> = {
  small: {
    userCount: 10,
    albumsPerUser: 2,
    imagesPerAlbum: 3,
    friendConnectionRate: 0.3,
    watchesPerUser: 3,
    likesPerAlbum: 3,
    commentsPerAlbum: 2,
    reactionsPerAlbum: 2,
  },
  medium: {
    userCount: 50,
    albumsPerUser: 3,
    imagesPerAlbum: 5,
    friendConnectionRate: 0.1,
    watchesPerUser: 5,
    likesPerAlbum: 10,
    commentsPerAlbum: 3,
    reactionsPerAlbum: 5,
  },
  large: {
    userCount: 100,
    albumsPerUser: 3,
    imagesPerAlbum: 5,
    friendConnectionRate: 0.05,
    watchesPerUser: 10,
    likesPerAlbum: 20,
    commentsPerAlbum: 5,
    reactionsPerAlbum: 10,
  },
};

// ヘルパー関数
function randomString(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomPickMultiple<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

function randomPastDate(daysAgo: number = 365): Date {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return new Date(past);
}

// データ生成関数
function generateUsers(count: number) {
  const firstNames = ['太郎', '花子', '次郎', '美咲', '健太', '愛子', '翔太', 'さくら', '大輔', '真由'];
  const lastNames = ['田中', '山田', '佐藤', '鈴木', '高橋', '伊藤', '渡辺', '中村', '小林', '加藤'];
  
  return Array.from({ length: count }, (_, i) => {
    const uid = `user_${String(i).padStart(4, '0')}`;
    return {
      uid,
      displayName: randomPick(lastNames) + randomPick(firstNames),
      handle: `user_${randomString(6)}`,
      bio: `テストユーザー #${i + 1}`,
      iconURL: `https://picsum.photos/200/200?random=${randomString(6)}`,
      createdAt: randomPastDate(365),
      updatedAt: new Date(),
    };
  });
}

function generateAlbums(userIds: string[], albumsPerUser: number) {
  const titles = ['VRChat集会', '渋谷オフ会', '誕生日パーティー', 'クリスマスイベント', '新年会', '花見', '夏祭り', '忘年会'];
  let counter = 0;
  
  return userIds.flatMap((ownerId) =>
    Array.from({ length: albumsPerUser }, () => {
      const id = `album_${String(counter++).padStart(4, '0')}`;
      const createdAt = randomPastDate(180);
      return {
        id,
        ownerId,
        title: `${randomPick(titles)} ${randomString(4)}`,
        visibility: randomPick(['public', 'friends'] as const),
        createdAt,
        updatedAt: createdAt,
      };
    })
  );
}

function generateImages(albums: { id: string; ownerId: string }[], imagesPerAlbum: number) {
  let counter = 0;
  
  return albums.flatMap((album) =>
    Array.from({ length: imagesPerAlbum }, () => {
      const id = `image_${String(counter++).padStart(5, '0')}`;
      return {
        id,
        albumId: album.id,
        uploaderId: album.ownerId,
        url: `https://picsum.photos/1920/1080?random=${randomString(8)}`,
        thumbUrl: `https://picsum.photos/400/300?random=${randomString(8)}`,
        createdAt: randomPastDate(90),
      };
    })
  );
}

function generateComments(albumIds: string[], userIds: string[], commentsPerAlbum: number) {
  const bodies = ['すごい！', 'いい写真！', 'また参加したい', '楽しそう！', 'ナイスショット！', '最高！'];
  let counter = 0;
  
  return albumIds.flatMap((albumId) => {
    const commenters = randomPickMultiple(userIds, commentsPerAlbum);
    return commenters.map((userId) => ({
      id: `comment_${String(counter++).padStart(5, '0')}`,
      albumId,
      userId,
      body: randomPick(bodies),
      createdAt: randomPastDate(30),
    }));
  });
}

function generateLikes(albumIds: string[], userIds: string[], likesPerAlbum: number) {
  let counter = 0;
  
  return albumIds.flatMap((albumId) => {
    const likers = randomPickMultiple(userIds, likesPerAlbum);
    return likers.map((userId) => ({
      id: `like_${String(counter++).padStart(5, '0')}`,
      albumId,
      userId,
      createdAt: randomPastDate(30),
    }));
  });
}

function generateReactions(albumIds: string[], userIds: string[], reactionsPerAlbum: number) {
  const emojis = ['❤️', '👍', '😊', '🎉', '🔥', '✨', '💯', '🙌'];
  let counter = 0;
  
  return albumIds.flatMap((albumId) => {
    const reactors = randomPickMultiple(userIds, reactionsPerAlbum);
    return reactors.map((userId) => {
      const emoji = randomPick(emojis);
      return {
        id: `${albumId}:${userId}:${emoji}`,
        albumId,
        userId,
        emoji,
        createdAt: randomPastDate(30),
      };
    });
  });
}

function generateFriends(userIds: string[], connectionRate: number) {
  const friends: Array<{ id: string; userId: string; targetId: string; status: string; createdAt: Date }> = [];
  
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      if (Math.random() < connectionRate) {
        const createdAt = randomPastDate(180);
        friends.push(
          { id: `friend_${userIds[i]}_${userIds[j]}`, userId: userIds[i], targetId: userIds[j], status: 'accepted', createdAt },
          { id: `friend_${userIds[j]}_${userIds[i]}`, userId: userIds[j], targetId: userIds[i], status: 'accepted', createdAt }
        );
      }
    }
  }
  return friends;
}

function generateWatches(userIds: string[], watchesPerUser: number) {
  let counter = 0;
  
  return userIds.flatMap((userId) => {
    const targets = randomPickMultiple(userIds.filter((id) => id !== userId), watchesPerUser);
    return targets.map((ownerId) => ({
      id: `watch_${String(counter++).padStart(5, '0')}`,
      userId,
      ownerId,
      createdAt: randomPastDate(90),
    }));
  });
}

// バッチ書き込み (Admin SDK)
async function batchWrite(collectionPath: string, documents: Array<{ id: string; [key: string]: unknown }>, batchSize: number = 500) {
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = db.batch();
    const chunk = documents.slice(i, i + batchSize);
    
    chunk.forEach(({ id, ...data }) => {
      const ref = db.collection(collectionPath).doc(id);
      batch.set(ref, data);
    });
    
    await batch.commit();
    console.log(`  ${collectionPath}: ${Math.min(i + batchSize, documents.length)}/${documents.length}`);
  }
}

// コレクション削除
async function clearCollection(collectionPath: string) {
  const snapshot = await db.collection(collectionPath).get();
  const batch = db.batch();
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
  console.log(`  Cleared ${collectionPath}: ${snapshot.size} docs`);
}

// メイン処理
async function seed(configName: string) {
  const config = CONFIGS[configName];
  if (!config) {
    console.error(`Unknown config: ${configName}`);
    console.log('Available: small, medium, large');
    process.exit(1);
  }

  console.log(`\n🌱 Seeding with "${configName}" config...`);
  console.log(config);
  console.log('');

  // ユーザー生成
  const users = generateUsers(config.userCount);
  console.log(`📝 Generated ${users.length} users`);
  await batchWrite('users', users.map((u) => ({ ...u, id: u.uid })));

  // アルバム生成
  const userIds = users.map((u) => u.uid);
  const albums = generateAlbums(userIds, config.albumsPerUser);
  console.log(`📝 Generated ${albums.length} albums`);
  await batchWrite('albums', albums.map(({ id, ...data }) => ({ id, ...data })));

  // 画像生成
  const images = generateImages(albums.map((a) => ({ id: a.id, ownerId: a.ownerId })), config.imagesPerAlbum);
  console.log(`📝 Generated ${images.length} images`);
  await batchWrite('albumImages', images.map(({ id, ...data }) => ({ id, ...data })));

  // フレンド生成
  const friends = generateFriends(userIds, config.friendConnectionRate);
  console.log(`📝 Generated ${friends.length} friends`);
  await batchWrite('friends', friends.map(({ id, ...data }) => ({ id, ...data })));

  // ウォッチ生成
  const watches = generateWatches(userIds, config.watchesPerUser);
  console.log(`📝 Generated ${watches.length} watches`);
  await batchWrite('watches', watches.map(({ id, ...data }) => ({ id, ...data })));

  // コメント生成
  const albumIds = albums.map((a) => a.id);
  const comments = generateComments(albumIds, userIds, config.commentsPerAlbum);
  console.log(`📝 Generated ${comments.length} comments`);
  await batchWrite('comments', comments.map(({ id, ...data }) => ({ id, ...data })));

  // いいね生成
  const likes = generateLikes(albumIds, userIds, config.likesPerAlbum);
  console.log(`📝 Generated ${likes.length} likes`);
  await batchWrite('likes', likes.map(({ id, ...data }) => ({ id, ...data })));

  // リアクション生成
  const reactions = generateReactions(albumIds, userIds, config.reactionsPerAlbum);
  console.log(`📝 Generated ${reactions.length} reactions`);
  await batchWrite('reactions', reactions.map(({ id, ...data }) => ({ id, ...data })));

  console.log('\n✅ Seed completed!');
  console.log(`   Users: ${users.length}`);
  console.log(`   Albums: ${albums.length}`);
  console.log(`   Images: ${images.length}`);
  console.log(`   Friends: ${friends.length}`);
  console.log(`   Watches: ${watches.length}`);
  console.log(`   Comments: ${comments.length}`);
  console.log(`   Likes: ${likes.length}`);
  console.log(`   Reactions: ${reactions.length}`);
}

async function reset() {
  console.log('\n🗑️ Clearing all data...');
  
  const collections = ['users', 'albums', 'albumImages', 'friends', 'watches', 'comments', 'likes', 'reactions', 'reposts', 'notifications'];
  
  for (const col of collections) {
    try {
      await clearCollection(col);
    } catch (e) {
      console.log(`  ${col}: (empty or error)`);
    }
  }
  
  console.log('\n✅ Reset completed!');
}

// CLI
const command = process.argv[2] || 'small';

if (command === 'reset') {
  reset().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
} else {
  seed(command).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

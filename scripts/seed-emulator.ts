/**
 * エミュレータ用シードスクリプト
 * 大量のテストデータをエミュレータに投入
 * 
 * Firebase Admin SDK を使用してセキュリティルールをバイパス
 * 
 * 使用方法:
 *   npm run seed:small   - 10ユーザー、簡易テスト
 *   npm run seed:medium  - 50ユーザー、一般テスト
 *   npm run seed:large   - 200ユーザー、パフォーマンステスト
 *   npm run seed:stress  - 500ユーザー、負荷テスト
 *   npm run seed:social  - 100ユーザー、ソーシャル機能重視
 *   npm run seed:albums  - 30ユーザー、コンテンツ重視
 *   npm run seed:fresh   - 50ユーザー、新規ユーザー中心
 *   npm run seed:active  - 30ユーザー、アクティブユーザー中心
 *   npm run seed:reset   - 全データ削除
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// パターン定義のインポート
import {
  SEED_PATTERNS,
  type SeedConfig,
  NAMES,
  generateAlbumTitle,
  generateComment,
  generateReaction,
  generateBio,
  generateDisplayName,
  randomInRange,
  randomPick,
  randomPickMultiple,
  randomPastDate,
  randomString,
} from './seed-patterns';

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
const auth = getAuth();

// データ生成関数
function generateUsers(count: number, config: SeedConfig) {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const uid = `user_${String(i).padStart(4, '0')}`;
    const handle = `user_${randomString(6)}`;
    const displayName = generateDisplayName();
    const email = `user${i}@test.local`;  // テスト用メールアドレス
    
    // 古いアカウントを含める場合のバリエーション
    let createdDaysAgo = 365;
    if (config.includeInactiveUsers && Math.random() < 0.2) {
      createdDaysAgo = randomInRange(365, 730); // 1-2年前
    }
    
    users.push({
      uid,
      email,
      displayName,
      handle,
      bio: generateBio(i + 1, handle),
      iconURL: `https://picsum.photos/200/200?random=${randomString(6)}`,
      createdAt: randomPastDate(createdDaysAgo),
      updatedAt: new Date(),
    });
  }
  
  return users;
}

// Firebase Auth にユーザーを作成
async function createAuthUsers(users: Array<{ uid: string; email: string; displayName: string }>) {
  const password = 'password123';  // テスト用共通パスワード
  
  for (const user of users) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: password,
        displayName: user.displayName,
        emailVerified: true,
      });
    } catch (error: unknown) {
      // ユーザーが既に存在する場合は無視
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/uid-already-exists') {
        continue;
      }
      throw error;
    }
  }
  console.log(`  Auth users created: ${users.length}`);
  console.log(`  📧 Login: user0@test.local 〜 user${users.length - 1}@test.local`);
  console.log(`  🔑 Password: ${password}`);
}

function generateAlbums(users: { uid: string }[], config: SeedConfig) {
  let counter = 0;
  const albums = [];
  
  for (const user of users) {
    // 空のユーザーを含める場合
    let albumCount = randomInRange(config.albumsPerUser.min, config.albumsPerUser.max);
    if (config.includeEmptyUsers && Math.random() < 0.1) {
      albumCount = 0; // 10%のユーザーは投稿なし
    }
    
    // ヘビーユーザーを含める場合
    if (config.includeHeavyUsers && Math.random() < 0.05) {
      albumCount = randomInRange(config.albumsPerUser.max * 2, config.albumsPerUser.max * 4);
    }
    
    for (let i = 0; i < albumCount; i++) {
      const id = `album_${String(counter++).padStart(4, '0')}`;
      const createdAt = randomPastDate(180);
      const isPublic = Math.random() < config.publicAlbumRate;
      
      albums.push({
        id,
        ownerId: user.uid,
        title: generateAlbumTitle(),
        visibility: isPublic ? 'public' : 'friends',
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  
  return albums;
}

function generateImages(albums: { id: string; ownerId: string }[], config: SeedConfig) {
  let counter = 0;
  const images = [];
  
  for (const album of albums) {
    const imageCount = randomInRange(config.imagesPerAlbum.min, config.imagesPerAlbum.max);
    
    for (let i = 0; i < imageCount; i++) {
      const id = `image_${String(counter++).padStart(5, '0')}`;
      images.push({
        id,
        albumId: album.id,
        uploaderId: album.ownerId,
        url: `https://picsum.photos/1920/1080?random=${randomString(8)}`,
        thumbUrl: `https://picsum.photos/400/300?random=${randomString(8)}`,
        createdAt: randomPastDate(90),
      });
    }
  }
  
  return images;
}

function generateComments(albumIds: string[], userIds: string[], config: SeedConfig) {
  let counter = 0;
  const comments = [];
  
  for (const albumId of albumIds) {
    const commentCount = randomInRange(config.commentsPerAlbum.min, config.commentsPerAlbum.max);
    const commenters = randomPickMultiple(userIds, commentCount);
    
    for (const userId of commenters) {
      comments.push({
        id: `comment_${String(counter++).padStart(5, '0')}`,
        albumId,
        userId,
        body: generateComment(),
        createdAt: randomPastDate(30),
      });
    }
  }
  
  return comments;
}

function generateLikes(albumIds: string[], userIds: string[], config: SeedConfig) {
  let counter = 0;
  const likes = [];
  
  for (const albumId of albumIds) {
    const likeCount = randomInRange(config.likesPerAlbum.min, config.likesPerAlbum.max);
    const likers = randomPickMultiple(userIds, likeCount);
    
    for (const userId of likers) {
      likes.push({
        id: `like_${String(counter++).padStart(5, '0')}`,
        albumId,
        userId,
        createdAt: randomPastDate(30),
      });
    }
  }
  
  return likes;
}

function generateReactions(albumIds: string[], userIds: string[], config: SeedConfig) {
  const reactions = [];
  
  for (const albumId of albumIds) {
    const reactionCount = randomInRange(config.reactionsPerAlbum.min, config.reactionsPerAlbum.max);
    const reactors = randomPickMultiple(userIds, reactionCount);
    
    for (const userId of reactors) {
      const emoji = generateReaction();
      reactions.push({
        id: `${albumId}:${userId}:${emoji}`,
        albumId,
        userId,
        emoji,
        createdAt: randomPastDate(30),
      });
    }
  }
  
  return reactions;
}

function generateFriends(userIds: string[], config: SeedConfig) {
  const friends: Array<{ id: string; userId: string; targetId: string; status: string; createdAt: Date }> = [];
  
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      if (Math.random() < config.friendConnectionRate) {
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

function generateWatches(userIds: string[], config: SeedConfig) {
  let counter = 0;
  const watches = [];
  
  for (const userId of userIds) {
    const watchCount = randomInRange(config.watchesPerUser.min, config.watchesPerUser.max);
    const targets = randomPickMultiple(userIds.filter((id) => id !== userId), watchCount);
    
    for (const ownerId of targets) {
      watches.push({
        id: `watch_${String(counter++).padStart(5, '0')}`,
        userId,
        ownerId,
        createdAt: randomPastDate(90),
      });
    }
  }
  
  return watches;
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
  const config = SEED_PATTERNS[configName];
  if (!config) {
    console.error(`Unknown config: ${configName}`);
    console.log('Available patterns:', Object.keys(SEED_PATTERNS).join(', '));
    process.exit(1);
  }

  console.log(`\n🌱 Seeding with "${configName}" config...`);
  console.log(`   Users: ${config.userCount}`);
  console.log(`   Albums per user: ${config.albumsPerUser.min}-${config.albumsPerUser.max}`);
  console.log(`   Images per album: ${config.imagesPerAlbum.min}-${config.imagesPerAlbum.max}`);
  console.log(`   Friend connection rate: ${(config.friendConnectionRate * 100).toFixed(0)}%`);
  console.log('');

  // ユーザー生成
  const users = generateUsers(config.userCount, config);
  console.log(`📝 Generated ${users.length} users`);
  
  // Firebase Auth にユーザーを作成
  await createAuthUsers(users);
  
  // Firestore にユーザードキュメントを作成
  await batchWrite('users', users.map((u) => ({ ...u, id: u.uid })));

  // アルバム生成
  const albums = generateAlbums(users, config);
  console.log(`📝 Generated ${albums.length} albums`);
  await batchWrite('albums', albums.map(({ id, ...data }) => ({ id, ...data })));

  // 画像生成
  const images = generateImages(albums.map((a) => ({ id: a.id, ownerId: a.ownerId })), config);
  console.log(`📝 Generated ${images.length} images`);
  await batchWrite('albumImages', images.map(({ id, ...data }) => ({ id, ...data })));

  // フレンド生成
  const userIds = users.map((u) => u.uid);
  const friends = generateFriends(userIds, config);
  console.log(`📝 Generated ${friends.length} friends`);
  await batchWrite('friends', friends.map(({ id, ...data }) => ({ id, ...data })));

  // ウォッチ生成
  const watches = generateWatches(userIds, config);
  console.log(`📝 Generated ${watches.length} watches`);
  await batchWrite('watches', watches.map(({ id, ...data }) => ({ id, ...data })));

  // コメント生成
  const albumIds = albums.map((a) => a.id);
  const comments = generateComments(albumIds, userIds, config);
  console.log(`📝 Generated ${comments.length} comments`);
  await batchWrite('comments', comments.map(({ id, ...data }) => ({ id, ...data })));

  // いいね生成
  const likes = generateLikes(albumIds, userIds, config);
  console.log(`📝 Generated ${likes.length} likes`);
  await batchWrite('likes', likes.map(({ id, ...data }) => ({ id, ...data })));

  // リアクション生成
  const reactions = generateReactions(albumIds, userIds, config);
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
  
  // Firebase Auth ユーザーを削除
  try {
    const listResult = await auth.listUsers(1000);
    if (listResult.users.length > 0) {
      const uids = listResult.users.map(u => u.uid);
      await auth.deleteUsers(uids);
      console.log(`  Cleared Auth users: ${uids.length}`);
    } else {
      console.log(`  Auth users: 0`);
    }
  } catch (e) {
    console.log(`  Auth users: (error)`);
  }
  
  // Firestore コレクションを削除
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

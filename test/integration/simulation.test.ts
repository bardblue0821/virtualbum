import {
  setupTestEnvironment,
  clearFirestoreData,
  cleanupTestEnvironment,
  adminSeedDocuments,
  adminGetDocs,
} from '../helpers/emulator';
import {
  generateSeedData,
  SMALL_SEED_CONFIG,
  DEFAULT_SEED_CONFIG,
} from '../factories/seeder';
import {
  createBulkUsers,
  createAlbumsForUsers,
  createImagesForAlbums,
  createFriendNetwork,
  createWatchNetwork,
} from '../factories';

jest.setTimeout(120000);

describe('Simulation Test', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    await clearFirestoreData();
  });

  describe('Data Generation', () => {
    test('can generate seed data in memory', () => {
      const result = generateSeedData(SMALL_SEED_CONFIG);

      expect(result.userIds.length).toBe(SMALL_SEED_CONFIG.userCount);
      expect(result.albumIds.length).toBe(
        SMALL_SEED_CONFIG.userCount * SMALL_SEED_CONFIG.albumsPerUser
      );
      expect(result.imageIds.length).toBe(
        SMALL_SEED_CONFIG.userCount *
          SMALL_SEED_CONFIG.albumsPerUser *
          SMALL_SEED_CONFIG.imagesPerAlbum
      );

      console.log('Generated seed stats:', result.stats);
    });

    test('can verify default config data estimation', () => {
      const result = generateSeedData(DEFAULT_SEED_CONFIG);

      expect(result.stats.albums).toBe(300);
      expect(result.stats.images).toBe(1500);

      console.log('Default config stats:', result.stats);
    });
  });

  describe('Firestore Seeding', () => {
    test('can seed small data to Firestore', async () => {
      const config = SMALL_SEED_CONFIG;
      
      const users = createBulkUsers(config.userCount);
      const userDocs = users.map((u) => {
        const data = { ...u } as Record<string, unknown>;
        delete data.uid;
        return { id: u.uid, data };
      });
      await adminSeedDocuments('users', userDocs);

      const userIds = users.map((u) => u.uid);
      const albums = createAlbumsForUsers(userIds, config.albumsPerUser);
      const albumDocs = albums.map((a) => {
        const data = { ...a } as Record<string, unknown>;
        delete data.id;
        if (data.placeUrl === undefined) delete data.placeUrl;
        return { id: a.id, data };
      });
      await adminSeedDocuments('albums', albumDocs);

      const images = createImagesForAlbums(
        albums.map((a) => ({ id: a.id, ownerId: a.ownerId })),
        config.imagesPerAlbum
      );
      const imageDocs = images.map((i) => {
        const data = { ...i } as Record<string, unknown>;
        delete data.id;
        if (data.thumbUrl === undefined) delete data.thumbUrl;
        return { id: i.id, data };
      });
      await adminSeedDocuments('albumImages', imageDocs);

      const allUsers = await adminGetDocs('users');
      expect(allUsers.length).toBe(config.userCount);

      const allAlbums = await adminGetDocs('albums');
      expect(allAlbums.length).toBe(config.userCount * config.albumsPerUser);

      const allImages = await adminGetDocs('albumImages');
      expect(allImages.length).toBe(
        config.userCount * config.albumsPerUser * config.imagesPerAlbum
      );

      console.log('Seeded:', {
        users: allUsers.length,
        albums: allAlbums.length,
        images: allImages.length,
      });
    });
  });

  describe('Data Integrity', () => {
    test('friend relationships are bidirectional', async () => {
      const users = createBulkUsers(10);
      const userDocs = users.map((u) => {
        const data = { ...u } as Record<string, unknown>;
        delete data.uid;
        return { id: u.uid, data };
      });
      await adminSeedDocuments('users', userDocs);

      const userIds = users.map((u) => u.uid);
      const friends = createFriendNetwork(userIds, 0.3);
      const friendDocs = friends.map((f) => {
        const data = { ...f } as Record<string, unknown>;
        delete data.id;
        return { id: f.id, data };
      });
      await adminSeedDocuments('friends', friendDocs);

      const allFriends = await adminGetDocs('friends');
      const acceptedFriends = allFriends.filter((f) => f.data.status === 'accepted');

      const sample = acceptedFriends.slice(0, 5);
      for (const friend of sample) {
        const reverse = acceptedFriends.find(
          (f) =>
            f.data.userId === friend.data.targetId &&
            f.data.targetId === friend.data.userId
        );
        expect(reverse).toBeDefined();
      }
    });

    test('album owners exist as users', async () => {
      const users = createBulkUsers(5);
      const userDocs = users.map((u) => {
        const data = { ...u } as Record<string, unknown>;
        delete data.uid;
        return { id: u.uid, data };
      });
      await adminSeedDocuments('users', userDocs);

      const userIds = users.map((u) => u.uid);
      const albums = createAlbumsForUsers(userIds, 2);
      const albumDocs = albums.map((a) => {
        const data = { ...a } as Record<string, unknown>;
        delete data.id;
        if (data.placeUrl === undefined) delete data.placeUrl;
        return { id: a.id, data };
      });
      await adminSeedDocuments('albums', albumDocs);

      const allUsers = await adminGetDocs('users');
      const userIdSet = new Set(allUsers.map((u) => u.id));

      const allAlbums = await adminGetDocs('albums');
      for (const album of allAlbums) {
        expect(userIdSet.has(album.data.ownerId as string)).toBe(true);
      }
    });
  });
});

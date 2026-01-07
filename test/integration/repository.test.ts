import {
  setupTestEnvironment,
  clearFirestoreData,
  cleanupTestEnvironment,
  getAuthenticatedContext,
  adminSetDoc,
  adminGetDoc,
  adminSeedDocuments,
  adminGetDocs,
} from '../helpers/emulator';
import {
  createUser,
  createSeedUsers,
  createAlbum,
  createSeedAlbums,
} from '../factories';

describe('Repository Integration Test', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    await clearFirestoreData();
  });

  describe('User Repository', () => {
    test('can create and retrieve a user', async () => {
      const userData = createUser({ uid: 'alice', displayName: 'Alice', handle: 'alice' });
      const data = { ...userData };
      delete (data as Record<string, unknown>).uid;
      
      await adminSetDoc('users', 'alice', data);
      const retrieved = await adminGetDoc('users', 'alice');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.displayName).toBe('Alice');
      expect(retrieved?.handle).toBe('alice');
    });

    test('can seed multiple users', async () => {
      const users = createSeedUsers();
      const docs = users.map((u) => {
        const data = { ...u } as Record<string, unknown>;
        delete data.uid;
        return { id: u.uid, data };
      });
      
      await adminSeedDocuments('users', docs);
      const allUsers = await adminGetDocs('users');
      
      expect(allUsers.length).toBe(5);
    });
  });

  describe('Album Repository', () => {
    test('can create and retrieve an album', async () => {
      const userData = createUser({ uid: 'alice' });
      const userDoc = { ...userData } as Record<string, unknown>;
      delete userDoc.uid;
      await adminSetDoc('users', 'alice', userDoc);

      const album = createAlbum({ id: 'album1', ownerId: 'alice', title: 'Test Album' });
      const albumDoc = { ...album } as Record<string, unknown>;
      delete albumDoc.id;
      if (albumDoc.placeUrl === undefined) delete albumDoc.placeUrl;
      
      await adminSetDoc('albums', 'album1', albumDoc);
      const retrieved = await adminGetDoc('albums', 'album1');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Test Album');
      expect(retrieved?.ownerId).toBe('alice');
    });

    test('can seed albums for multiple users', async () => {
      const users = createSeedUsers();
      const userDocs = users.map((u) => {
        const data = { ...u } as Record<string, unknown>;
        delete data.uid;
        return { id: u.uid, data };
      });
      await adminSeedDocuments('users', userDocs);

      const albums = createSeedAlbums(users.map((u) => u.uid));
      const albumDocs = albums.map((a) => {
        const data = { ...a } as Record<string, unknown>;
        delete data.id;
        if (data.placeUrl === undefined) delete data.placeUrl;
        return { id: a.id, data };
      });
      await adminSeedDocuments('albums', albumDocs);

      const allAlbums = await adminGetDocs('albums');
      expect(allAlbums.length).toBeGreaterThan(0);
    });
  });
});

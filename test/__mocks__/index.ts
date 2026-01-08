/**
 * テスト用共通モック - インデックス
 */

// Firebase Auth
export * from './firebaseAuth';

// Firebase Firestore
export * from './firebaseFirestore';

// テスト用のユーザーデータ
export const testUsers = {
  default: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    handle: 'testuser',
    bio: 'This is a test user',
    iconURL: null,
    createdAt: new Date('2024-01-01'),
  },
  admin: {
    uid: 'admin-user-456',
    email: 'admin@example.com',
    displayName: 'Admin User',
    handle: 'admin',
    bio: 'Admin user',
    iconURL: null,
    isAdmin: true,
    createdAt: new Date('2024-01-01'),
  },
  // ブロック機能テスト用
  userA: {
    uid: 'user-a-111',
    email: 'usera@example.com',
    displayName: 'User A',
    handle: 'usera',
    bio: 'User A for block test',
    iconURL: null,
    createdAt: new Date('2024-01-01'),
  },
  userB: {
    uid: 'user-b-222',
    email: 'userb@example.com',
    displayName: 'User B',
    handle: 'userb',
    bio: 'User B for block test',
    iconURL: null,
    createdAt: new Date('2024-01-01'),
  },
};

// テスト用のアルバムデータ
export const testAlbums = {
  public: {
    id: 'album-1',
    ownerId: 'test-user-123',
    title: 'Test Album',
    visibility: 'public' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  friends: {
    id: 'album-2',
    ownerId: 'test-user-123',
    title: 'Friends Only Album',
    visibility: 'friends' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Next.js navigation モック
export function setupNextNavigationMock(options?: {
  pathname?: string;
  searchParams?: Record<string, string>;
}) {
  const pathname = options?.pathname || '/';
  const searchParams = new URLSearchParams(options?.searchParams || {});
  
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }),
    usePathname: () => pathname,
    useSearchParams: () => searchParams,
    useParams: () => ({}),
    redirect: jest.fn(),
    notFound: jest.fn(),
  };
}

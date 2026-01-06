/**
 * Firebase Auth の共通モック
 */

// モック関数
export const mockCreateUser = jest.fn();
export const mockSignIn = jest.fn();
export const mockSignOut = jest.fn();
export const mockSendPasswordReset = jest.fn();
export const mockSendEmailVerification = jest.fn();
export const mockSignInWithPopup = jest.fn();
export const mockOnAuthStateChanged = jest.fn();

// 認証済みユーザーのモック
export const mockAuthUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  isAnonymous: false,
  providerData: [{ providerId: 'password' }],
  getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
};

// デフォルトのモック設定
export function setupFirebaseAuthMock(options?: { 
  user?: typeof mockAuthUser | null;
  autoCallback?: boolean;
}) {
  const user = options?.user ?? null;
  const autoCallback = options?.autoCallback ?? true;
  
  mockOnAuthStateChanged.mockImplementation((auth, callback) => {
    if (autoCallback) {
      callback(user);
    }
    return jest.fn(); // unsubscribe function
  });
  
  return {
    getAuth: jest.fn(),
    createUserWithEmailAndPassword: mockCreateUser,
    signInWithEmailAndPassword: mockSignIn,
    signOut: mockSignOut,
    sendPasswordResetEmail: mockSendPasswordReset,
    sendEmailVerification: mockSendEmailVerification,
    signInWithPopup: mockSignInWithPopup,
    onAuthStateChanged: mockOnAuthStateChanged,
    GoogleAuthProvider: jest.fn(),
    TwitterAuthProvider: jest.fn(),
    EmailAuthProvider: {
      credential: jest.fn().mockReturnValue({}),
    },
    reauthenticateWithCredential: jest.fn().mockResolvedValue({}),
    reauthenticateWithPopup: jest.fn().mockResolvedValue({}),
    deleteUser: jest.fn().mockResolvedValue(undefined),
  };
}

// すべてのモックをリセット
export function resetFirebaseAuthMocks() {
  mockCreateUser.mockReset();
  mockSignIn.mockReset();
  mockSignOut.mockReset();
  mockSendPasswordReset.mockReset();
  mockSendEmailVerification.mockReset();
  mockSignInWithPopup.mockReset();
  mockOnAuthStateChanged.mockReset();
}

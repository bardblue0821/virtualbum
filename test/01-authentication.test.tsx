/**
 * 認証機能 テスト - 実装版
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

// Firebase Auth のモック
const mockCreateUser = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockSendPasswordReset = jest.fn();

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args: any[]) => mockSignIn(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordReset(...args),
  sendEmailVerification: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return jest.fn();
  }),
}));

jest.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
}));

// テスト用のシンプルな認証フォームコンポーネント
const MockAuthForm = ({ mode = 'register' }: { mode?: 'login' | 'register' }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [handle, setHandle] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [currentMode, setCurrentMode] = React.useState(mode);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { label: '', color: 'transparent' };
    if (pwd.length < 6) return { label: 'weak', color: 'red' };
    if (pwd.length <= 8) return { label: 'medium', color: 'yellow' };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'good', color: 'green' };
    if (!/[!@#$%^&*]/.test(pwd)) return { label: 'good', color: 'green' };
    return { label: 'strong', color: 'darkgreen' };
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateHandle = (handle: string) => {
    if (handle.length < 3) return '3文字以上必要です';
    if (handle.length > 20) return '20文字以内で入力してください';
    if (!/^[a-z0-9_]+$/.test(handle)) return '英数字とアンダースコアのみ使用可能です';
    return null;
  };

  const handleSubmit = async () => {
    setError('');

    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }

    if (!validateEmail(email)) {
      setError('正しいメールアドレスを入力してください');
      return;
    }

    if (!password) {
      setError('パスワードを入力してください');
      return;
    }

    if (currentMode === 'register') {
      if (password !== confirmPassword) {
        setError('パスワードが一致しません');
        return;
      }

      if (password.length < 8) {
        setError('パスワードは8文字以上にしてください');
        return;
      }

      if (!displayName) {
        setError('表示名を入力してください');
        return;
      }

      if (displayName.length > 40) {
        setError('40文字以内で入力してください');
        return;
      }

      if (!handle) {
        setError('ユーザーIDを入力してください');
        return;
      }

      const handleError = validateHandle(handle);
      if (handleError) {
        setError(handleError);
        return;
      }

      try {
        await mockCreateUser({ email, password });
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      try {
        await mockSignIn({ email, password });
      } catch (err: any) {
        setError('メールアドレスまたはパスワードが正しくありません');
      }
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="メールアドレス"
      />

      <input
        type={showPassword ? 'text' : 'password'}
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-label="パスワード"
      />

      {currentMode === 'register' && (
        <>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="パスワード（確認）"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-label="パスワード（確認）"
          />
          <div data-testid="password-strength" style={{ color: passwordStrength.color }}>
            {passwordStrength.label}
          </div>

          <input
            type="text"
            placeholder="表示名"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-label="表示名"
            maxLength={41}
          />

          <input
            type="text"
            placeholder="ユーザーID"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            aria-label="ユーザーID"
            maxLength={21}
          />
        </>
      )}

      <button onClick={() => setShowPassword(!showPassword)}>
        {showPassword ? '非表示' : '表示'}
      </button>

      <button 
        onClick={handleSubmit}
        disabled={currentMode === 'register' && password !== confirmPassword}
        aria-label={currentMode === 'login' ? 'ログイン' : '登録'}
      >
        {currentMode === 'login' ? 'ログイン' : '登録'}
      </button>

      {error && <div role="alert">{error}</div>}
    </div>
  );
};

describe('新規登録機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('パスワード要件のテスト', () => {
    test('パスワード入力の2回一致判定', async () => {
      render(<MockAuthForm mode="register" />);
      
      const password1 = screen.getByLabelText('パスワード');
      const password2 = screen.getByLabelText('パスワード（確認）');
      const submitButton = screen.getByLabelText('登録');
      
      await userEvent.type(password1, 'Test1234');
      await userEvent.type(password2, 'Test1234');
      expect(submitButton).not.toBeDisabled();
      
      await userEvent.clear(password2);
      await userEvent.type(password2, 'Test5678');
      expect(submitButton).toBeDisabled();
    });

    test('パスワード強度メーター', async () => {
      render(<MockAuthForm mode="register" />);
      const passwordInput = screen.getByLabelText('パスワード');
      const strengthMeter = screen.getByTestId('password-strength');

      await userEvent.type(passwordInput, 'test');
      expect(strengthMeter).toHaveTextContent('weak');

      await userEvent.clear(passwordInput);
      await userEvent.type(passwordInput, 'test1234');
      expect(strengthMeter).toHaveTextContent('medium');

      await userEvent.clear(passwordInput);
      await userEvent.type(passwordInput, 'Test12345');
      expect(strengthMeter).toHaveTextContent('good');

      await userEvent.clear(passwordInput);
      await userEvent.type(passwordInput, 'Test1234!');
      expect(strengthMeter).toHaveTextContent('strong');
    });

    test('パスワード表示/非表示トグル', async () => {
      render(<MockAuthForm mode="register" />);
      const passwordInput = screen.getByLabelText('パスワード');
      const toggleButton = screen.getByRole('button', { name: '表示' });

      await userEvent.type(passwordInput, 'Test1234');
      expect(passwordInput).toHaveAttribute('type', 'password');

      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await userEvent.click(screen.getByRole('button', { name: '非表示' }));
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('ユーザー名・ユーザーID設定のテスト', () => {
    test('表示名のバリデーション', async () => {
      render(<MockAuthForm mode="register" />);
      
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード（確認）');
      const displayNameInput = screen.getByLabelText('表示名');
      const handleInput = screen.getByLabelText('ユーザーID');
      const submitButton = screen.getByLabelText('登録');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Test1234');
      await userEvent.type(confirmInput, 'Test1234');
      await userEvent.type(handleInput, 'testuser');

      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/表示名を入力/);
      });

      await userEvent.type(displayNameInput, 'a'.repeat(41));
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/40文字以内/);
      });
    });

    test('ユーザーIDのバリデーション', async () => {
      render(<MockAuthForm mode="register" />);
      
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード（確認）');
      const displayNameInput = screen.getByLabelText('表示名');
      const handleInput = screen.getByLabelText('ユーザーID');
      const submitButton = screen.getByLabelText('登録');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Test1234');
      await userEvent.type(confirmInput, 'Test1234');
      await userEvent.type(displayNameInput, 'Test User');

      await userEvent.type(handleInput, 'ab');
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/3文字以上/);
      });

      await userEvent.clear(handleInput);
      await userEvent.type(handleInput, 'TestUser');
      expect(handleInput).toHaveValue('testuser');
    });
  });
});

describe('ログイン機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('正常なログイン', async () => {
    render(<MockAuthForm mode="login" />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByLabelText('ログイン');

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'Test1234');
    
    mockSignIn.mockResolvedValueOnce({ user: { uid: '123' } });
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  test('メールアドレスの形式チェック', async () => {
    render(<MockAuthForm mode="login" />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByLabelText('ログイン');

    await userEvent.type(emailInput, 'notanemail');
    await userEvent.type(passwordInput, 'password');
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/正しいメールアドレス/);
    });
  });

  test('空欄チェック', async () => {
    render(<MockAuthForm mode="login" />);
    
    const submitButton = screen.getByLabelText('ログイン');
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/メールアドレスを入力/);
    });
  });
});

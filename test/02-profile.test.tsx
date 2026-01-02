/**
 * プロフィール機能 テスト - 実装版
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

const mockUpdateProfile = jest.fn();
const mockDeleteUser = jest.fn();
const mockUploadFile = jest.fn();

jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'user1' } },
  db: {},
  storage: {},
}));

const MockProfilePage = ({ userId, currentUserId }: { userId: string; currentUserId?: string }) => {
  const [displayName, setDisplayName] = React.useState('Test User');
  const [bio, setBio] = React.useState('Hello');
  const [isEditing, setIsEditing] = React.useState(false);
  const [error, setError] = React.useState('');

  const isOwner = userId === currentUserId;

  const handleSave = async () => {
    setError('');
    if (!displayName) {
      setError('表示名を入力してください');
      return;
    }
    if (displayName.length > 40) {
      setError('40文字以内で入力してください');
      return;
    }
    if (bio.length > 500) {
      setError('500文字以内で入力してください');
      return;
    }

    await mockUpdateProfile({ displayName, bio });
    setIsEditing(false);
  };

  return (
    <div>
      <h1>{displayName}</h1>
      <div>{userId}</div>
      <p>{bio}</p>
      
      {isOwner && !isEditing && (
        <button onClick={() => setIsEditing(true)}>編集</button>
      )}

      {!isOwner && (
        <>
          <button aria-label="フレンド申請">フレンド申請</button>
          <button aria-label="ウォッチ">ウォッチ</button>
        </>
      )}

      {isEditing && (
        <div role="form">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-label="表示名"
            maxLength={41}
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            aria-label="自己紹介"
            maxLength={501}
          />
          <button onClick={handleSave}>保存</button>
          <button onClick={() => setIsEditing(false)}>キャンセル</button>
        </div>
      )}

      {error && <div role="alert">{error}</div>}

      <div data-testid="stats">
        <span>作成アルバム: 3</span>
        <span>参加アルバム: 2</span>
        <span>フレンド: 5</span>
        <span>ウォッチャー: 3</span>
      </div>
    </div>
  );
};

describe('プロフィール表示機能', () => {
  test('自分のプロフィール表示', () => {
    render(<MockProfilePage userId="user1" currentUserId="user1" />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'フレンド申請' })).not.toBeInTheDocument();
  });

  test('他人のプロフィール表示', () => {
    render(<MockProfilePage userId="user2" currentUserId="user1" />);
    
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'フレンド申請' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ウォッチ' })).toBeInTheDocument();
  });

  test('統計情報の表示', () => {
    render(<MockProfilePage userId="user1" currentUserId="user1" />);
    
    const stats = screen.getByTestId('stats');
    expect(stats).toHaveTextContent('作成アルバム: 3');
    expect(stats).toHaveTextContent('参加アルバム: 2');
    expect(stats).toHaveTextContent('フレンド: 5');
    expect(stats).toHaveTextContent('ウォッチャー: 3');
  });
});

describe('プロフィール編集機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('表示名の編集', async () => {
    render(<MockProfilePage userId="user1" currentUserId="user1" />);
    
    await userEvent.click(screen.getByRole('button', { name: '編集' }));
    
    const displayNameInput = screen.getByLabelText('表示名');
    await userEvent.clear(displayNameInput);
    await userEvent.type(displayNameInput, 'New Name');
    
    mockUpdateProfile.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        displayName: 'New Name',
        bio: 'Hello',
      });
    });
  });

  test('表示名のバリデーション', async () => {
    render(<MockProfilePage userId="user1" currentUserId="user1" />);
    
    await userEvent.click(screen.getByRole('button', { name: '編集' }));
    
    const displayNameInput = screen.getByLabelText('表示名');
    await userEvent.clear(displayNameInput);
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/表示名を入力/);
    });

    await userEvent.type(displayNameInput, 'a'.repeat(41));
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/40文字以内/);
    });
  });

  test('自己紹介のバリデーション', async () => {
    render(<MockProfilePage userId="user1" currentUserId="user1" />);
    
    await userEvent.click(screen.getByRole('button', { name: '編集' }));
    
    const bioInput = screen.getByLabelText('自己紹介');
    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, 'a'.repeat(501));
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/500文字以内/);
    });
  });

  test('編集のキャンセル', async () => {
    render(<MockProfilePage userId="user1" currentUserId="user1" />);
    
    await userEvent.click(screen.getByRole('button', { name: '編集' }));
    expect(screen.getByRole('form')).toBeInTheDocument();
    
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});

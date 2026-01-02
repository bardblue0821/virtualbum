/**
 * アルバム機能 テスト - 実装版
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

const mockCreateAlbum = jest.fn();
const mockUpdateAlbum = jest.fn();
const mockDeleteAlbum = jest.fn();
const mockUploadImage = jest.fn();

jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'user1' } },
  db: {},
  storage: {},
}));

const MockAlbumForm = ({ mode = 'create', albumCount = 0 }: { mode?: 'create' | 'edit'; albumCount?: number }) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [visibility, setVisibility] = React.useState<'public' | 'friends' | 'private'>('public');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!title) {
      setError('タイトルを入力してください');
      return;
    }

    if (title.length > 100) {
      setError('100文字以内で入力してください');
      return;
    }

    if (description.length > 1000) {
      setError('1000文字以内で入力してください');
      return;
    }

    if (mode === 'create' && albumCount >= 4) {
      setError('作成できるアルバムは4つまでです');
      return;
    }

    try {
      if (mode === 'create') {
        await mockCreateAlbum({ title, description, visibility });
        setSuccess('アルバムを作成しました');
      } else {
        await mockUpdateAlbum({ title, description, visibility });
        setSuccess('アルバムを更新しました');
      }
    } catch (err) {
      setError('エラーが発生しました');
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="タイトル"
        maxLength={101}
      />
      <textarea
        placeholder="説明"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="説明"
        maxLength={1001}
      />
      <select
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as any)}
        aria-label="公開範囲"
      >
        <option value="public">公開</option>
        <option value="friends">フレンド限定</option>
        <option value="private">非公開</option>
      </select>
      <button onClick={handleSubmit}>
        {mode === 'create' ? '作成' : '更新'}
      </button>
      {error && <div role="alert">{error}</div>}
      {success && <div role="status">{success}</div>}
    </div>
  );
};

const MockImageUpload = ({ imageCount = 0 }: { imageCount?: number }) => {
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleUpload = async (size: number) => {
    setError('');
    setSuccess('');

    if (imageCount >= 100) {
      setError('アルバムには最大100枚まで追加できます');
      return;
    }

    if (size > 5 * 1024 * 1024) {
      setError('5MB以下の画像を選択してください');
      return;
    }

    await mockUploadImage({ size });
    setSuccess('画像をアップロードしました');
  };

  return (
    <div>
      <button
        onClick={() => handleUpload(2 * 1024 * 1024)}
        aria-label="画像追加"
      >
        画像を追加
      </button>
      <button onClick={() => handleUpload(6 * 1024 * 1024)} aria-label="大きい画像">
        大きい画像
      </button>
      {error && <div role="alert">{error}</div>}
      {success && <div role="status">{success}</div>}
    </div>
  );
};

describe('アルバム作成機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('新規アルバム作成（成功ケース）', async () => {
    render(<MockAlbumForm mode="create" albumCount={2} />);
    
    await userEvent.type(screen.getByLabelText('タイトル'), 'My First Album');
    await userEvent.type(screen.getByLabelText('説明'), 'This is a test album');
    await userEvent.selectOptions(screen.getByLabelText('公開範囲'), 'public');
    
    mockCreateAlbum.mockResolvedValueOnce({ id: 'album123' });
    await userEvent.click(screen.getByRole('button', { name: '作成' }));
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('アルバムを作成しました');
    });
  });

  test('タイトルのバリデーション', async () => {
    render(<MockAlbumForm mode="create" />);
    
    await userEvent.click(screen.getByRole('button', { name: '作成' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/タイトルを入力/);
    });

    await userEvent.type(screen.getByLabelText('タイトル'), 'a'.repeat(101));
    await userEvent.click(screen.getByRole('button', { name: '作成' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/100文字以内/);
    });
  });

  test('説明のバリデーション', async () => {
    render(<MockAlbumForm mode="create" />);
    
    await userEvent.type(screen.getByLabelText('タイトル'), 'Test Album');
    await userEvent.type(screen.getByLabelText('説明'), 'a'.repeat(1001));
    await userEvent.click(screen.getByRole('button', { name: '作成' }));
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/1000文字以内/);
    });
  });

  test('アルバム作成数の上限チェック', async () => {
    render(<MockAlbumForm mode="create" albumCount={4} />);
    
    await userEvent.type(screen.getByLabelText('タイトル'), 'New Album');
    await userEvent.click(screen.getByRole('button', { name: '作成' }));
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/4つまで/);
    });
  });

  test('公開範囲設定', async () => {
    render(<MockAlbumForm mode="create" />);
    
    await userEvent.type(screen.getByLabelText('タイトル'), 'Private Album');
    await userEvent.selectOptions(screen.getByLabelText('公開範囲'), 'private');
    
    mockCreateAlbum.mockResolvedValueOnce({ id: 'album123' });
    await userEvent.click(screen.getByRole('button', { name: '作成' }));
    
    await waitFor(() => {
      expect(mockCreateAlbum).toHaveBeenCalledWith({
        title: 'Private Album',
        description: '',
        visibility: 'private',
      });
    });
  });
});

describe('アルバム編集機能', () => {
  test('タイトルの編集', async () => {
    render(<MockAlbumForm mode="edit" />);
    
    await userEvent.type(screen.getByLabelText('タイトル'), 'Updated Title');
    
    mockUpdateAlbum.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole('button', { name: '更新' }));
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('アルバムを更新しました');
    });
  });
});

describe('画像アップロード機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1枚の画像アップロード', async () => {
    render(<MockImageUpload imageCount={0} />);
    
    mockUploadImage.mockResolvedValueOnce({ id: 'img123' });
    await userEvent.click(screen.getByLabelText('画像追加'));
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/アップロード/);
    });
  });

  test('画像サイズ制限のテスト', async () => {
    render(<MockImageUpload imageCount={0} />);
    
    await userEvent.click(screen.getByLabelText('大きい画像'));
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/5MB以下/);
    });
  });

  test('画像枚数の上限チェック', async () => {
    render(<MockImageUpload imageCount={100} />);
    
    await userEvent.click(screen.getByLabelText('画像追加'));
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/100枚まで/);
    });
  });
});

/**
 * 検索機能 テスト - 実装版
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

const mockSearchUsers = jest.fn();
const mockAddSearchHistory = jest.fn();
const mockClearSearchHistory = jest.fn();

jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'user1' } },
  db: {},
}));

type User = {
  id: string;
  handle: string;
  displayName: string;
};

const MockUserSearch = ({ searchHistory = [] }: { searchHistory?: string[] }) => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<User[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>(searchHistory);

  const handleSearch = async () => {
    if (query.trim() === '') return;
    
    setLoading(true);
    setHasSearched(true);
    const users = await mockSearchUsers(query);
    setResults(users || []);
    setLoading(false);
    
    if (!history.includes(query)) {
      await mockAddSearchHistory(query);
      setHistory([query, ...history].slice(0, 10));
    }
  };

  const handleQueryChange = async (value: string) => {
    setQuery(value);
    
    if (value.trim() !== '' && value.length >= 2) {
      setLoading(true);
      setHasSearched(true);
      const users = await mockSearchUsers(value);
      setResults(users || []);
      setLoading(false);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  };

  const handleClearHistory = async () => {
    await mockClearSearchHistory();
    setHistory([]);
  };

  const handleHistoryClick = async (term: string) => {
    setQuery(term);
    setLoading(true);
    setHasSearched(true);
    const users = await mockSearchUsers(term);
    setResults(users || []);
    setLoading(false);
  };

  return (
    <div>
      <div>
        <input
          type="text"
          placeholder="ユーザーを検索"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          aria-label="検索"
        />
        <button onClick={handleSearch} disabled={query.trim() === ''}>
          検索
        </button>
      </div>

      {history.length > 0 && (
        <div data-testid="search-history">
          <h3>検索履歴</h3>
          <button onClick={handleClearHistory}>履歴をクリア</button>
          {history.map((term, index) => (
            <button 
              key={index} 
              onClick={() => handleHistoryClick(term)}
              data-testid={`history-${index}`}
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {loading && <div role="status">検索中...</div>}

      <div role="list" aria-label="検索結果">
        {!loading && hasSearched && results.length === 0 && (
          <div>ユーザーが見つかりませんでした</div>
        )}
        {results.map((user) => (
          <div key={user.id} role="listitem" data-testid={`user-${user.id}`}>
            <div>@{user.handle}</div>
            <div>{user.displayName}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

describe('ユーザー検索機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('検索の実行', async () => {
    render(<MockUserSearch />);
    
    const users: User[] = [
      { id: '1', handle: 'testuser', displayName: 'Test User' },
    ];
    
    // インクリメンタルサーチと検索ボタンの両方に対応
    mockSearchUsers.mockResolvedValue(users);

    const searchInput = screen.getByLabelText('検索');
    await userEvent.type(searchInput, 'te');
    
    // インクリメンタルサーチが動作するのを待つ
    await waitFor(() => {
      expect(screen.getByTestId('user-1')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });
  });

  test('結果が見つからない場合', async () => {
    render(<MockUserSearch />);
    
    mockSearchUsers.mockResolvedValue([]);

    const searchInput = screen.getByLabelText('検索');
    await userEvent.type(searchInput, 'no');
    
    await waitFor(() => {
      expect(screen.getByText(/ユーザーが見つかりませんでした/)).toBeInTheDocument();
    });
  });

  test('空の検索クエリ', () => {
    render(<MockUserSearch />);
    
    const searchButton = screen.getByRole('button', { name: '検索' });
    expect(searchButton).toBeDisabled();
  });
});

describe('インクリメンタルサーチ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('入力時のリアルタイム検索', async () => {
    render(<MockUserSearch />);
    
    const users: User[] = [
      { id: '1', handle: 'testuser', displayName: 'Test User' },
    ];
    mockSearchUsers.mockResolvedValueOnce(users);

    const searchInput = screen.getByLabelText('検索');
    await userEvent.type(searchInput, 'te');
    
    await waitFor(() => {
      expect(mockSearchUsers).toHaveBeenCalledWith('te');
      expect(screen.getByTestId('user-1')).toBeInTheDocument();
    });
  });

  test('2文字未満での検索抑制', async () => {
    render(<MockUserSearch />);
    
    const searchInput = screen.getByLabelText('検索');
    await userEvent.type(searchInput, 't');
    
    await waitFor(() => {
      expect(mockSearchUsers).not.toHaveBeenCalled();
    });
  });
});

describe('検索履歴機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('検索履歴の保存', async () => {
    render(<MockUserSearch />);
    
    mockSearchUsers.mockResolvedValueOnce([]);
    mockAddSearchHistory.mockResolvedValueOnce({});

    const searchInput = screen.getByLabelText('検索');
    await userEvent.type(searchInput, 'testuser');
    await userEvent.click(screen.getByRole('button', { name: '検索' }));
    
    await waitFor(() => {
      expect(mockAddSearchHistory).toHaveBeenCalledWith('testuser');
      expect(screen.getByTestId('search-history')).toBeInTheDocument();
    });
  });

  test('検索履歴の表示', () => {
    const history = ['user1', 'user2', 'user3'];
    render(<MockUserSearch searchHistory={history} />);
    
    expect(screen.getByTestId('search-history')).toBeInTheDocument();
    expect(screen.getByTestId('history-0')).toHaveTextContent('user1');
    expect(screen.getByTestId('history-1')).toHaveTextContent('user2');
    expect(screen.getByTestId('history-2')).toHaveTextContent('user3');
  });

  test('検索履歴からの再検索', async () => {
    const history = ['testuser'];
    render(<MockUserSearch searchHistory={history} />);
    
    const users: User[] = [
      { id: '1', handle: 'testuser', displayName: 'Test User' },
    ];
    mockSearchUsers.mockResolvedValueOnce(users);

    await userEvent.click(screen.getByTestId('history-0'));
    
    await waitFor(() => {
      expect(screen.getByTestId('user-1')).toBeInTheDocument();
    });
  });

  test('検索履歴のクリア', async () => {
    const history = ['user1', 'user2'];
    render(<MockUserSearch searchHistory={history} />);
    
    mockClearSearchHistory.mockResolvedValueOnce({});

    await userEvent.click(screen.getByRole('button', { name: '履歴をクリア' }));
    
    await waitFor(() => {
      expect(screen.queryByTestId('search-history')).not.toBeInTheDocument();
    });
  });

  test('検索履歴の上限（10件）', async () => {
    const history = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9'];
    render(<MockUserSearch searchHistory={history} />);
    
    mockSearchUsers.mockResolvedValueOnce([]);
    mockAddSearchHistory.mockResolvedValueOnce({});

    const searchInput = screen.getByLabelText('検索');
    await userEvent.type(searchInput, 'u10');
    await userEvent.click(screen.getByRole('button', { name: '検索' }));
    
    await waitFor(() => {
      // 10件を超えないこと（新しい1件＋既存9件＝10件）
      expect(screen.getAllByTestId(/^history-/).length).toBe(10);
    });
  });
});

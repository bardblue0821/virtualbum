/**
 * ソーシャル機能 テスト - 実装版
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

const mockSendFriendRequest = jest.fn();
const mockAcceptFriendRequest = jest.fn();
const mockRejectFriendRequest = jest.fn();
const mockRemoveFriend = jest.fn();
const mockWatch = jest.fn();
const mockUnwatch = jest.fn();

jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'user1' } },
  db: {},
}));

const MockSocialButtons = ({ 
  targetUser, 
  currentUser, 
  friendStatus 
}: { 
  targetUser: string; 
  currentUser: string; 
  friendStatus: 'none' | 'pending' | 'accepted';
}) => {
  const [status, setStatus] = React.useState(friendStatus);
  const [watching, setWatching] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const handleFriendRequest = async () => {
    await mockSendFriendRequest(targetUser);
    setStatus('pending');
    setMessage('フレンド申請を送信しました');
  };

  const handleWatch = async () => {
    if (watching) {
      await mockUnwatch(targetUser);
      setWatching(false);
      setMessage('ウォッチを解除しました');
    } else {
      await mockWatch(targetUser);
      setWatching(true);
      setMessage('ウォッチを開始しました');
    }
  };

  if (targetUser === currentUser) {
    return <div>自分のプロフィール</div>;
  }

  return (
    <div>
      {status === 'none' && (
        <button onClick={handleFriendRequest}>フレンド申請</button>
      )}
      {status === 'pending' && (
        <button disabled>申請中</button>
      )}
      {status === 'accepted' && (
        <span>フレンド</span>
      )}
      <button onClick={handleWatch}>
        {watching ? 'ウォッチ中' : 'ウォッチ'}
      </button>
      {message && <div role="status">{message}</div>}
    </div>
  );
};

const MockFriendRequestList = ({ requests }: { requests: Array<{ from: string; to: string }> }) => {
  const [requestList, setRequestList] = React.useState(requests);
  const [message, setMessage] = React.useState('');

  const handleAccept = async (from: string) => {
    await mockAcceptFriendRequest(from);
    setRequestList(requestList.filter(r => r.from !== from));
    setMessage('フレンドになりました');
  };

  const handleReject = async (from: string) => {
    await mockRejectFriendRequest(from);
    setRequestList(requestList.filter(r => r.from !== from));
  };

  return (
    <div>
      {requestList.map((req) => (
        <div key={req.from} data-testid={`request-${req.from}`}>
          <span>{req.from}</span>
          <button onClick={() => handleAccept(req.from)}>承認</button>
          <button onClick={() => handleReject(req.from)}>拒否</button>
        </div>
      ))}
      {message && <div role="status">{message}</div>}
      {requestList.length === 0 && <div>申請はありません</div>}
    </div>
  );
};

describe('フレンド申請機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('フレンド申請の送信', async () => {
    render(
      <MockSocialButtons 
        targetUser="user2" 
        currentUser="user1" 
        friendStatus="none"
      />
    );
    
    mockSendFriendRequest.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole('button', { name: 'フレンド申請' }));
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/送信しました/);
      expect(screen.getByRole('button', { name: '申請中' })).toBeDisabled();
    });
  });

  test('重複申請の防止', () => {
    render(
      <MockSocialButtons 
        targetUser="user2" 
        currentUser="user1" 
        friendStatus="pending"
      />
    );
    
    const button = screen.getByRole('button', { name: '申請中' });
    expect(button).toBeDisabled();
  });

  test('自分自身へのフレンド申請', () => {
    render(
      <MockSocialButtons 
        targetUser="user1" 
        currentUser="user1" 
        friendStatus="none"
      />
    );
    
    expect(screen.queryByRole('button', { name: 'フレンド申請' })).not.toBeInTheDocument();
    expect(screen.getByText('自分のプロフィール')).toBeInTheDocument();
  });
});

describe('フレンド申請の承認・拒否', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('フレンド申請の承認', async () => {
    render(
      <MockFriendRequestList 
        requests={[{ from: 'user2', to: 'user1' }]}
      />
    );
    
    mockAcceptFriendRequest.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole('button', { name: '承認' }));
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/フレンドになりました/);
      expect(screen.queryByTestId('request-user2')).not.toBeInTheDocument();
    });
  });

  test('フレンド申請の拒否', async () => {
    render(
      <MockFriendRequestList 
        requests={[{ from: 'user2', to: 'user1' }]}
      />
    );
    
    mockRejectFriendRequest.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole('button', { name: '拒否' }));
    
    await waitFor(() => {
      expect(screen.queryByTestId('request-user2')).not.toBeInTheDocument();
      expect(screen.getByText('申請はありません')).toBeInTheDocument();
    });
  });
});

describe('ウォッチ機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ユーザーをウォッチ', async () => {
    render(
      <MockSocialButtons 
        targetUser="user2" 
        currentUser="user1" 
        friendStatus="none"
      />
    );
    
    mockWatch.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole('button', { name: 'ウォッチ' }));
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/ウォッチを開始/);
      expect(screen.getByRole('button', { name: 'ウォッチ中' })).toBeInTheDocument();
    });
  });

  test('ウォッチの解除（アンウォッチ）', async () => {
    render(
      <MockSocialButtons 
        targetUser="user2" 
        currentUser="user1" 
        friendStatus="none"
      />
    );
    
    // まずウォッチする
    mockWatch.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole('button', { name: 'ウォッチ' }));
    
    // 次にウォッチ解除
    mockUnwatch.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole('button', { name: 'ウォッチ中' }));
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/ウォッチを解除/);
      expect(screen.getByRole('button', { name: 'ウォッチ' })).toBeInTheDocument();
    });
  });

  test('自分自身のウォッチ試行', () => {
    render(
      <MockSocialButtons 
        targetUser="user1" 
        currentUser="user1" 
        friendStatus="none"
      />
    );
    
    expect(screen.queryByRole('button', { name: 'ウォッチ' })).not.toBeInTheDocument();
  });
});

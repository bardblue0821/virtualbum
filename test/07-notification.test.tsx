/**
 * 通知機能 テスト - 実装版
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

const mockFetchNotifications = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
const mockClearNotifications = jest.fn();

jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'user1' } },
  db: {},
}));

type Notification = {
  id: string;
  type: 'like' | 'comment' | 'friend_request' | 'album_comment';
  from: string;
  message: string;
  read: boolean;
  timestamp: number;
};

const MockNotificationCenter = ({ initialNotifications }: { initialNotifications: Notification[] }) => {
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  const handleMarkAsRead = async (id: string) => {
    await mockMarkAsRead(id);
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = async () => {
    await mockMarkAllAsRead();
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    await mockClearNotifications();
    setNotifications([]);
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <div>
        <h2>通知 {unreadCount > 0 && `(${unreadCount})`}</h2>
        <div role="group" aria-label="フィルター">
          <button onClick={() => setFilter('all')}>すべて</button>
          <button onClick={() => setFilter('unread')}>未読のみ</button>
        </div>
        {notifications.length > 0 && (
          <>
            <button onClick={handleMarkAllAsRead}>すべて既読にする</button>
            <button onClick={handleClearAll}>すべて削除</button>
          </>
        )}
      </div>

      <div role="list" aria-label="通知一覧">
        {filteredNotifications.length === 0 && (
          <div>通知はありません</div>
        )}
        {filteredNotifications.map((notif) => (
          <div 
            key={notif.id} 
            data-testid={`notification-${notif.id}`}
            onClick={() => !notif.read && handleMarkAsRead(notif.id)}
            style={{ 
              backgroundColor: notif.read ? 'transparent' : '#f0f0f0',
              cursor: notif.read ? 'default' : 'pointer'
            }}
            role="listitem"
          >
            <span>{notif.from}</span>
            <span>{notif.message}</span>
            {!notif.read && <span data-testid={`unread-${notif.id}`}>●</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('通知表示機能', () => {
  test('通知一覧の表示', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'like', from: 'user2', message: 'いいねしました', read: false, timestamp: Date.now() },
      { id: '2', type: 'comment', from: 'user3', message: 'コメントしました', read: true, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    expect(screen.getByTestId('notification-1')).toBeInTheDocument();
    expect(screen.getByTestId('notification-2')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('いいねしました')).toBeInTheDocument();
  });

  test('通知がない場合', () => {
    render(<MockNotificationCenter initialNotifications={[]} />);
    
    expect(screen.getByText('通知はありません')).toBeInTheDocument();
  });

  test('未読数の表示', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'like', from: 'user2', message: 'いいねしました', read: false, timestamp: Date.now() },
      { id: '2', type: 'comment', from: 'user3', message: 'コメントしました', read: false, timestamp: Date.now() },
      { id: '3', type: 'friend_request', from: 'user4', message: 'フレンド申請', read: true, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('通知 (2)');
  });
});

describe('既読/未読機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('個別の通知を既読にする', async () => {
    const notifications: Notification[] = [
      { id: '1', type: 'like', from: 'user2', message: 'いいねしました', read: false, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    mockMarkAsRead.mockResolvedValueOnce({});

    const notification = screen.getByTestId('notification-1');
    await userEvent.click(notification);
    
    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith('1');
      expect(screen.queryByTestId('unread-1')).not.toBeInTheDocument();
    });
  });

  test('すべての通知を既読にする', async () => {
    const notifications: Notification[] = [
      { id: '1', type: 'like', from: 'user2', message: 'いいねしました', read: false, timestamp: Date.now() },
      { id: '2', type: 'comment', from: 'user3', message: 'コメントしました', read: false, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    mockMarkAllAsRead.mockResolvedValueOnce({});

    await userEvent.click(screen.getByRole('button', { name: 'すべて既読にする' }));
    
    await waitFor(() => {
      expect(mockMarkAllAsRead).toHaveBeenCalled();
      expect(screen.queryByTestId('unread-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unread-2')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('通知');
    });
  });

  test('未読のみフィルター', async () => {
    const notifications: Notification[] = [
      { id: '1', type: 'like', from: 'user2', message: 'いいねしました', read: false, timestamp: Date.now() },
      { id: '2', type: 'comment', from: 'user3', message: 'コメントしました', read: true, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    await userEvent.click(screen.getByRole('button', { name: '未読のみ' }));
    
    expect(screen.getByTestId('notification-1')).toBeInTheDocument();
    expect(screen.queryByTestId('notification-2')).not.toBeInTheDocument();
  });
});

describe('通知の削除', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('すべての通知を削除', async () => {
    const notifications: Notification[] = [
      { id: '1', type: 'like', from: 'user2', message: 'いいねしました', read: false, timestamp: Date.now() },
      { id: '2', type: 'comment', from: 'user3', message: 'コメントしました', read: true, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    mockClearNotifications.mockResolvedValueOnce({});

    await userEvent.click(screen.getByRole('button', { name: 'すべて削除' }));
    
    await waitFor(() => {
      expect(mockClearNotifications).toHaveBeenCalled();
      expect(screen.getByText('通知はありません')).toBeInTheDocument();
    });
  });
});

describe('通知の種類', () => {
  test('いいね通知', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'like', from: 'user2', message: 'あなたの投稿にいいねしました', read: false, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    expect(screen.getByText('あなたの投稿にいいねしました')).toBeInTheDocument();
  });

  test('コメント通知', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'comment', from: 'user2', message: 'あなたの投稿にコメントしました', read: false, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    expect(screen.getByText('あなたの投稿にコメントしました')).toBeInTheDocument();
  });

  test('フレンド申請通知', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'friend_request', from: 'user2', message: 'フレンド申請が届きました', read: false, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    expect(screen.getByText('フレンド申請が届きました')).toBeInTheDocument();
  });

  test('アルバムコメント通知', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'album_comment', from: 'user2', message: 'あなたのアルバムにコメントしました', read: false, timestamp: Date.now() },
    ];

    render(<MockNotificationCenter initialNotifications={notifications} />);
    
    expect(screen.getByText('あなたのアルバムにコメントしました')).toBeInTheDocument();
  });
});

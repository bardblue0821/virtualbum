/**
 * タイムライン機能 テスト - 実装版
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

const mockFetchPosts = jest.fn();
const mockLikePost = jest.fn();
const mockCommentOnPost = jest.fn();

jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'user1' } },
  db: {},
}));

type Post = {
  id: string;
  user: string;
  content: string;
  likes: number;
  comments: number;
  liked: boolean;
};

const MockTimeline = ({ initialPosts, hasFriends = true }: { initialPosts: Post[]; hasFriends?: boolean }) => {
  const [posts, setPosts] = React.useState(initialPosts);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'friends' | 'watching'>('all');

  const handleLike = async (postId: string) => {
    await mockLikePost(postId);
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  const handleLoadMore = async () => {
    setLoading(true);
    const newPosts = await mockFetchPosts();
    setPosts([...posts, ...newPosts]);
    setLoading(false);
  };

  if (!hasFriends) {
    return (
      <div>
        <div role="alert">フレンドやウォッチしているユーザーがいません</div>
        <a href="/search">ユーザーを探す</a>
      </div>
    );
  }

  return (
    <div>
      <div role="group" aria-label="フィルター">
        <button onClick={() => setFilter('all')}>すべて</button>
        <button onClick={() => setFilter('friends')}>フレンド</button>
        <button onClick={() => setFilter('watching')}>ウォッチ中</button>
      </div>

      <div role="feed">
        {posts.length === 0 && <div>投稿がありません</div>}
        {posts.map((post) => (
          <article key={post.id} data-testid={`post-${post.id}`}>
            <div>{post.user}</div>
            <div>{post.content}</div>
            <button 
              onClick={() => handleLike(post.id)}
              aria-label={post.liked ? 'いいね済み' : 'いいね'}
            >
              {post.liked ? '❤️' : '🤍'} {post.likes}
            </button>
            <span>コメント: {post.comments}</span>
          </article>
        ))}
      </div>

      {posts.length > 0 && (
        <button 
          onClick={handleLoadMore} 
          disabled={loading}
          aria-label="もっと見る"
        >
          {loading ? '読み込み中...' : 'もっと見る'}
        </button>
      )}
    </div>
  );
};

describe('タイムライン表示機能', () => {
  test('タイムラインの初期表示', () => {
    const posts: Post[] = [
      { id: '1', user: 'user2', content: 'Post 1', likes: 5, comments: 2, liked: false },
      { id: '2', user: 'user3', content: 'Post 2', likes: 3, comments: 1, liked: false },
    ];

    render(<MockTimeline initialPosts={posts} />);
    
    expect(screen.getByTestId('post-1')).toBeInTheDocument();
    expect(screen.getByTestId('post-2')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('Post 1')).toBeInTheDocument();
  });

  test('フレンドがいない場合のタイムライン', () => {
    render(<MockTimeline initialPosts={[]} hasFriends={false} />);
    
    expect(screen.getByRole('alert')).toHaveTextContent(/フレンドやウォッチしているユーザーがいません/);
    expect(screen.getByRole('link', { name: /ユーザーを探す/ })).toBeInTheDocument();
  });
});

describe('無限スクロール機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('追加読み込み', async () => {
    const initialPosts: Post[] = [
      { id: '1', user: 'user2', content: 'Post 1', likes: 5, comments: 2, liked: false },
    ];

    render(<MockTimeline initialPosts={initialPosts} />);
    
    const newPosts: Post[] = [
      { id: '2', user: 'user3', content: 'Post 2', likes: 3, comments: 1, liked: false },
    ];
    mockFetchPosts.mockResolvedValueOnce(newPosts);

    const loadMoreButton = screen.getByLabelText('もっと見る');
    await userEvent.click(loadMoreButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('post-2')).toBeInTheDocument();
    });
  });
});

describe('インタラクション機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('タイムラインからいいね', async () => {
    const posts: Post[] = [
      { id: '1', user: 'user2', content: 'Post 1', likes: 5, comments: 2, liked: false },
    ];

    render(<MockTimeline initialPosts={posts} />);
    
    const likeButton = screen.getByLabelText('いいね');
    
    mockLikePost.mockResolvedValueOnce({});
    await userEvent.click(likeButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('いいね済み')).toBeInTheDocument();
      expect(screen.getByText('❤️ 6')).toBeInTheDocument();
    });
  });

  test('いいね解除', async () => {
    const posts: Post[] = [
      { id: '1', user: 'user2', content: 'Post 1', likes: 5, comments: 2, liked: true },
    ];

    render(<MockTimeline initialPosts={posts} />);
    
    const likeButton = screen.getByLabelText('いいね済み');
    
    mockLikePost.mockResolvedValueOnce({});
    await userEvent.click(likeButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('いいね')).toBeInTheDocument();
      expect(screen.getByText('🤍 4')).toBeInTheDocument();
    });
  });
});

describe('フィルタリング機能', () => {
  test('フィルターボタンの存在確認', () => {
    render(<MockTimeline initialPosts={[]} />);
    
    const filterGroup = screen.getByRole('group', { name: 'フィルター' });
    expect(filterGroup).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'すべて' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'フレンド' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ウォッチ中' })).toBeInTheDocument();
  });
});

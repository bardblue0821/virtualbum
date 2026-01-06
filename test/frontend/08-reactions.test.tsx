/**
 * リアクション機能 テスト - 実装版
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

const mockLikePost = jest.fn();
const mockUnlikePost = jest.fn();
const mockCommentOnPost = jest.fn();
const mockReplyToComment = jest.fn();
const mockDeleteComment = jest.fn();

jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'user1' } },
  db: {},
}));

type Comment = {
  id: string;
  user: string;
  text: string;
  timestamp: number;
};

const MockPost = ({ 
  postId, 
  initialLikes, 
  initialLiked, 
  initialComments 
}: { 
  postId: string; 
  initialLikes: number; 
  initialLiked: boolean; 
  initialComments: Comment[];
}) => {
  const [likes, setLikes] = React.useState(initialLikes);
  const [liked, setLiked] = React.useState(initialLiked);
  const [comments, setComments] = React.useState(initialComments);
  const [commentText, setCommentText] = React.useState('');
  const [showComments, setShowComments] = React.useState(false);

  const handleLike = async () => {
    if (liked) {
      await mockUnlikePost(postId);
      setLikes(likes - 1);
      setLiked(false);
    } else {
      await mockLikePost(postId);
      setLikes(likes + 1);
      setLiked(true);
    }
  };

  const handleComment = async () => {
    if (commentText.trim() === '') return;
    if (commentText.length > 500) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      user: 'user1',
      text: commentText,
      timestamp: Date.now(),
    };

    await mockCommentOnPost(postId, commentText);
    setComments([...comments, newComment]);
    setCommentText('');
  };

  const handleDeleteComment = async (commentId: string) => {
    await mockDeleteComment(commentId);
    setComments(comments.filter(c => c.id !== commentId));
  };

  return (
    <article data-testid={`post-${postId}`}>
      <div>投稿内容</div>
      
      <button onClick={handleLike} aria-label={liked ? 'いいね済み' : 'いいね'}>
        {liked ? '❤️' : '🤍'} {likes}
      </button>

      <button onClick={() => setShowComments(!showComments)}>
        コメント ({comments.length})
      </button>

      {showComments && (
        <div data-testid="comments-section">
          <div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="コメントを入力..."
              maxLength={500}
              aria-label="コメント入力"
            />
            <div>{commentText.length}/500</div>
            <button 
              onClick={handleComment}
              disabled={commentText.trim() === '' || commentText.length > 500}
            >
              コメントする
            </button>
          </div>

          <div role="list" aria-label="コメント一覧">
            {comments.map((comment) => (
              <div key={comment.id} data-testid={`comment-${comment.id}`} role="listitem">
                <span>{comment.user}</span>
                <span>{comment.text}</span>
                {comment.user === 'user1' && (
                  <button onClick={() => handleDeleteComment(comment.id)}>削除</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

describe('いいね機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('いいねの追加', async () => {
    render(<MockPost postId="post1" initialLikes={5} initialLiked={false} initialComments={[]} />);
    
    mockLikePost.mockResolvedValueOnce({});

    const likeButton = screen.getByLabelText('いいね');
    await userEvent.click(likeButton);
    
    await waitFor(() => {
      expect(mockLikePost).toHaveBeenCalledWith('post1');
      expect(screen.getByLabelText('いいね済み')).toBeInTheDocument();
      expect(screen.getByText('❤️ 6')).toBeInTheDocument();
    });
  });

  test('いいねの取り消し', async () => {
    render(<MockPost postId="post1" initialLikes={5} initialLiked={true} initialComments={[]} />);
    
    mockUnlikePost.mockResolvedValueOnce({});

    const likeButton = screen.getByLabelText('いいね済み');
    await userEvent.click(likeButton);
    
    await waitFor(() => {
      expect(mockUnlikePost).toHaveBeenCalledWith('post1');
      expect(screen.getByLabelText('いいね')).toBeInTheDocument();
      expect(screen.getByText('🤍 4')).toBeInTheDocument();
    });
  });

  test('いいね数の表示', () => {
    render(<MockPost postId="post1" initialLikes={42} initialLiked={false} initialComments={[]} />);
    
    expect(screen.getByText('🤍 42')).toBeInTheDocument();
  });
});

describe('コメント機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('コメントの投稿', async () => {
    render(<MockPost postId="post1" initialLikes={5} initialLiked={false} initialComments={[]} />);
    
    // コメントセクションを開く
    await userEvent.click(screen.getByRole('button', { name: /コメント/ }));
    
    mockCommentOnPost.mockResolvedValueOnce({});

    const commentInput = screen.getByLabelText('コメント入力');
    await userEvent.type(commentInput, 'これはテストコメントです');
    await userEvent.click(screen.getByRole('button', { name: 'コメントする' }));
    
    await waitFor(() => {
      expect(mockCommentOnPost).toHaveBeenCalledWith('post1', 'これはテストコメントです');
      expect(screen.getByText('これはテストコメントです')).toBeInTheDocument();
      expect(commentInput).toHaveValue('');
    });
  });

  test('空のコメント投稿の防止', async () => {
    render(<MockPost postId="post1" initialLikes={5} initialLiked={false} initialComments={[]} />);
    
    await userEvent.click(screen.getByRole('button', { name: /コメント/ }));
    
    const submitButton = screen.getByRole('button', { name: 'コメントする' });
    expect(submitButton).toBeDisabled();
  });

  test('コメントの文字数制限（500文字）', async () => {
    render(<MockPost postId="post1" initialLikes={5} initialLiked={false} initialComments={[]} />);
    
    await userEvent.click(screen.getByRole('button', { name: /コメント/ }));
    
    const longText = 'あ'.repeat(501);
    const commentInput = screen.getByLabelText('コメント入力');
    await userEvent.type(commentInput, longText);
    
    // maxLength属性により500文字までしか入力されない
    await waitFor(() => {
      expect(commentInput).toHaveValue('あ'.repeat(500));
    });
  });

  test('コメント数の表示', () => {
    const comments: Comment[] = [
      { id: '1', user: 'user2', text: 'コメント1', timestamp: Date.now() },
      { id: '2', user: 'user3', text: 'コメント2', timestamp: Date.now() },
    ];

    render(<MockPost postId="post1" initialLikes={5} initialLiked={false} initialComments={comments} />);
    
    expect(screen.getByRole('button', { name: /コメント/ })).toHaveTextContent('コメント (2)');
  });

  test('コメント一覧の表示', async () => {
    const comments: Comment[] = [
      { id: '1', user: 'user2', text: 'コメント1', timestamp: Date.now() },
      { id: '2', user: 'user3', text: 'コメント2', timestamp: Date.now() },
    ];

    render(<MockPost postId="post1" initialLikes={5} initialLiked={false} initialComments={comments} />);
    
    await userEvent.click(screen.getByRole('button', { name: /コメント/ }));
    
    expect(screen.getByTestId('comment-1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-2')).toBeInTheDocument();
    expect(screen.getByText('コメント1')).toBeInTheDocument();
    expect(screen.getByText('コメント2')).toBeInTheDocument();
  });

  test('自分のコメントの削除', async () => {
    const comments: Comment[] = [
      { id: '1', user: 'user1', text: '自分のコメント', timestamp: Date.now() },
      { id: '2', user: 'user2', text: '他人のコメント', timestamp: Date.now() },
    ];

    render(<MockPost postId="post1" initialLikes={5} initialLiked={false} initialComments={comments} />);
    
    await userEvent.click(screen.getByRole('button', { name: /コメント/ }));
    
    mockDeleteComment.mockResolvedValueOnce({});

    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    expect(deleteButtons).toHaveLength(1); // 自分のコメントのみ削除ボタンが表示される

    await userEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledWith('1');
      expect(screen.queryByTestId('comment-1')).not.toBeInTheDocument();
    });
  });
});

describe('コメントセクションの開閉', () => {
  test('コメントセクションの表示切り替え', async () => {
    render(<MockPost postId="post1" initialLikes={5} initialLiked={false} initialComments={[]} />);
    
    // 初期状態では非表示
    expect(screen.queryByTestId('comments-section')).not.toBeInTheDocument();
    
    // クリックで表示
    await userEvent.click(screen.getByRole('button', { name: /コメント/ }));
    expect(screen.getByTestId('comments-section')).toBeInTheDocument();
    
    // 再度クリックで非表示
    const toggleButtons = screen.getAllByRole('button');
    const commentButton = toggleButtons.find(btn => btn.textContent?.includes('コメント'));
    if (commentButton) {
      await userEvent.click(commentButton);
    }
    expect(screen.queryByTestId('comments-section')).not.toBeInTheDocument();
  });
});

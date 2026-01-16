"use client";
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { auth } from '@/lib/firebase';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function toHalfWidthAscii(text: string): string {
  return String(text)
    .replace(/\u3000/g, ' ')
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

export default function PasswordChangePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const { show } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // パスワード認証かどうか確認
  const canChangePassword = useMemo(() => {
    if (!user) return false;
    if (user.isAnonymous) return false;
    const providerIds = (user.providerData || []).map(p => p.providerId);
    return providerIds.includes('password') && !!user.email;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !user.email) {
      setError('ログインしていません');
      return;
    }

    if (!currentPassword) {
      setError('現在のパスワードを入力してください');
      return;
    }

    if (!newPassword) {
      setError('新しいパスワードを入力してください');
      return;
    }

    if (newPassword.length < 6) {
      setError('新しいパスワードは6文字以上にしてください');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    if (currentPassword === newPassword) {
      setError('新しいパスワードは現在のパスワードと異なるものにしてください');
      return;
    }

    setSubmitting(true);

    try {
      // 再認証
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // パスワード更新
      await updatePassword(user, newPassword);

      show({ message: 'パスワードを変更しました', variant: 'success' });
      
      // フォームをクリア
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // タイムラインに戻る
      setTimeout(() => {
        router.push('/timeline');
      }, 1500);
    } catch (err: any) {
      console.error('Password change error:', err);
      
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('現在のパスワードが正しくありません');
      } else if (err.code === 'auth/weak-password') {
        setError('新しいパスワードが弱すぎます。より強力なパスワードを設定してください');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('セキュリティのため、再ログインが必要です。一度ログアウトしてから再度お試しください');
      } else {
        setError(err.message || 'パスワードの変更に失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 読み込み中
  if (authLoading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  // 未ログイン
  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <h1 className="text-xl font-semibold">パスワードの変更</h1>
        <p className="text-sm text-muted">この機能を使用するにはログインが必要です。</p>
        <Button variant="accent" size="md" onClick={() => router.push('/login')}>
          ログイン
        </Button>
      </div>
    );
  }

  // パスワード認証でない（Google認証など）
  if (!canChangePassword) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <h1 className="text-xl font-semibold">パスワードの変更</h1>
        <div className="bg-surface-weak border border-line rounded p-4 space-y-2">
          <p className="text-sm">
            このアカウントはパスワード認証ではないため、パスワードの変更はできません。
          </p>
          <p className="text-xs text-muted">
            Google等の外部サービスでログインしている場合は、そのサービス側でパスワードを管理してください。
          </p>
        </div>
        <Button variant="ghost" size="md" onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">パスワードの変更</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="currentPassword" className="block text-sm font-medium">
            現在のパスワード
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(toHalfWidthAscii(e.target.value))}
            inputMode="text"
            lang="en"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full border border-line bg-transparent rounded px-3 py-2 text-sm focus:outline-none focus:border-[--accent]"
            placeholder="現在のパスワードを入力"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="newPassword" className="block text-sm font-medium">
            新しいパスワード
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(toHalfWidthAscii(e.target.value))}
            inputMode="text"
            lang="en"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full border border-line bg-transparent rounded px-3 py-2 text-sm focus:outline-none focus:border-[--accent]"
            placeholder="6文字以上"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium">
            新しいパスワード（確認）
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(toHalfWidthAscii(e.target.value))}
            inputMode="text"
            lang="en"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full border border-line bg-transparent rounded px-3 py-2 text-sm focus:outline-none focus:border-[--accent]"
            placeholder="もう一度入力"
            disabled={submitting}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => router.back()}
            disabled={submitting}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="accent"
            size="md"
            disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
          >
            {submitting ? '変更中...' : 'パスワードを変更'}
          </Button>
        </div>
      </form>
    </div>
  );
}

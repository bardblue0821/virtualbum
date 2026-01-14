"use client";
import { useState, useMemo, useCallback } from 'react';
import { User, deleteUser, reauthenticateWithCredential, EmailAuthProvider, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { deleteAccountData } from '@/src/services/deleteAccount';
import { translateError } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';
import { auth } from '@/lib/firebase';

interface UseDeleteAccountReturn {
  showDeleteAccount: boolean;
  setShowDeleteAccount: (show: boolean) => void;
  agreeDelete: boolean;
  setAgreeDelete: (agree: boolean) => void;
  deleting: boolean;
  deleteStep: string;
  pw: string;
  setPw: (pw: string) => void;
  canReauthWithPassword: boolean;
  canReauthWithGoogle: boolean;
  doDeleteAccount: () => Promise<void>;
  reauthGoogle: () => Promise<void>;
}

/**
 * 全角英数記号を半角に変換
 */
function toHalfWidthAscii(text: string): string {
  return String(text)
    .replace(/\u3000/g, ' ')
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

/**
 * アカウント削除を管理するカスタムフック
 */
export function useDeleteAccount(user: User | null | undefined): UseDeleteAccountReturn {
  const { show } = useToast();

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [agreeDelete, setAgreeDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<string>('');
  const [pw, setPw] = useState('');

  const providerIds = useMemo(
    () => (user?.providerData || []).map((p) => p.providerId).filter(Boolean),
    [user]
  );

  const canReauthWithPassword = useMemo(() => {
    if (!user) return false;
    if (user.isAnonymous) return false;
    return providerIds.includes('password') && !!user.email;
  }, [user, providerIds]);

  const canReauthWithGoogle = useMemo(() => {
    if (!user) return false;
    if (user.isAnonymous) return false;
    return providerIds.includes('google.com');
  }, [user, providerIds]);

  const doDeleteAccount = useCallback(async () => {
    if (!user) return;
    try {
      setDeleting(true);
      setDeleteStep('再認証中...');

      // プロバイダに応じて再認証
      if (canReauthWithPassword) {
        if (!pw) throw new Error('MISSING_PASSWORD');
        const email = user.email;
        if (!email) throw new Error('MISSING_EMAIL');
        const cred = EmailAuthProvider.credential(email, pw);
        await reauthenticateWithCredential(user, cred);
      } else if (canReauthWithGoogle) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }

      setDeleteStep('データ削除中...');
      await deleteAccountData(user.uid, (step) => setDeleteStep(`データ削除中: ${step}`));
      setDeleteStep('アカウント削除中...');
      await deleteUser(user);
      try {
        sessionStorage.setItem(
          'app:toast',
          JSON.stringify({ message: 'アカウントを削除しました', variant: 'success' })
        );
      } catch {}
      window.location.href = '/';
    } catch (e: any) {
      const msg = translateError(e);
      show({ message: msg, variant: 'error' });
      setDeleting(false);
    }
  }, [user, canReauthWithPassword, canReauthWithGoogle, pw, show]);

  const reauthGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(auth.currentUser!, provider);
    } catch {}
  }, []);

  // setPw wrapper to handle half-width conversion
  const setPwWithConversion = useCallback((value: string) => {
    setPw(toHalfWidthAscii(value));
  }, []);

  return {
    showDeleteAccount,
    setShowDeleteAccount,
    agreeDelete,
    setAgreeDelete,
    deleting,
    deleteStep,
    pw,
    setPw: setPwWithConversion,
    canReauthWithPassword,
    canReauthWithGoogle,
    doDeleteAccount,
    reauthGoogle,
  };
}

"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { ensureUser } from '@/lib/authUser';
import { isHandleTaken } from '@/lib/db/repositories/user.repository';
import { getHandleBlockReason, getDisplayNameBlockReason } from '@/lib/constants/userFilters';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  sendEmailVerification, 
  signOut 
} from 'firebase/auth';
import { signInWithTwitter, handleTwitterRedirectResult, translateTwitterAuthError } from '@/lib/auth/twitterAuth';

// セキュリティ方針: アカウント存在可否を推測されないため、認証失敗は統一メッセージにまとめる。
function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'メールアドレス形式が正しくありません';
    case 'auth/weak-password':
      return 'パスワードは6文字以上にしてください';
    case 'auth/popup-closed-by-user':
      return 'ポップアップが閉じられました';
    case 'auth/email-already-in-use':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
    case 'auth/invalid-credential':
    case 'auth/too-many-requests':
      return '認証に失敗しました';
    default:
      return '認証に失敗しました';
  }
}

function evaluateStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  
  const levels = [
    { min: 0, label: '弱い', cls: 'pw-strength-weak', percent: 20 },
    { min: 2, label: '普通', cls: 'pw-strength-fair', percent: 40 },
    { min: 3, label: '良い', cls: 'pw-strength-good', percent: 70 },
    { min: 4, label: '強い', cls: 'pw-strength-strong', percent: 100 }
  ];
  let picked = levels[0];
  for (const l of levels) { if (score >= l.min) picked = l; }
  return { 
    score, 
    label: pw ? picked.label : '', 
    percent: pw ? picked.percent : 0, 
    cls: pw ? picked.cls : '' 
  };
}

function basicHandleValid(h: string) {
  return /^[a-z0-9_]{3,20}$/i.test(h);
}

export type AuthMode = 'login' | 'register';

export function useAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdStrength, setPwdStrength] = useState({ score: 0, label: '', percent: 0, cls: '' });
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const [handleError, setHandleError] = useState<string | null>(null);

  // ログイン画面では、既に検証済みでログイン中ならトップへ
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.emailVerified) {
        router.replace('/timeline');
      }
    });
    return () => unsub();
  }, [router]);

  // Twitter リダイレクト認証の結果を処理
  useEffect(() => {
    let mounted = true;
    
    async function checkRedirectResult() {
      try {
        const result = await handleTwitterRedirectResult();
        if (result && mounted) {
          setInfo('X (Twitter) ログイン成功');
          router.push('/timeline');
        }
      } catch (err: any) {
        if (mounted) {
          setError(translateTwitterAuthError(err));
        }
      }
    }
    
    checkRedirectResult();
    return () => { mounted = false; };
  }, [router]);

  // パスワード強度評価
  useEffect(() => {
    setPwdStrength(evaluateStrength(password));
  }, [password]);

  // パスワード一致確認
  useEffect(() => {
    if (mode === 'register') {
      setMismatch(confirmPassword && password !== confirmPassword ? '確認用パスワードが一致しません' : null);
    } else {
      setMismatch(null);
    }
  }, [confirmPassword, password, mode]);

  // Handle 重複リアルタイムチェック
  useEffect(() => {
    if (mode !== 'register') return;
    setHandleError(null);
    if (!handle) { setHandleStatus('idle'); return; }
    if (!basicHandleValid(handle)) {
      setHandleStatus('invalid');
      setHandleError('形式: 英数字と_ 3〜20文字');
      return;
    }
    const blockedReason = getHandleBlockReason(handle);
    if (blockedReason) {
      setHandleStatus('invalid');
      setHandleError(blockedReason);
      return;
    }
    
    let active = true;
    setHandleStatus('checking');
    const t = setTimeout(async () => {
      try {
        const taken = await isHandleTaken(handle);
        if (!active) return;
        setHandleStatus(taken ? 'taken' : 'ok');
        setHandleError(taken ? '既に使われています' : '');
      } catch (e: any) {
        if (!active) return;
        setHandleStatus('invalid');
        setHandleError('チェック失敗');
      }
    }, 450);
    return () => { active = false; clearTimeout(t); };
  }, [handle, mode]);

  function validate(): boolean {
    if (!/@.+\./.test(email)) {
      setError('メールアドレスが不正です');
      return false;
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return false;
    }
    if (mode === 'register') {
      if (!displayName.trim()) { setError('ユーザー名を入力してください'); return false; }
      const dnReason = getDisplayNameBlockReason(displayName);
      if (dnReason) { setError(dnReason); return false; }
      if (!basicHandleValid(handle)) { setError('ユーザーIDは英数字と_で3〜20文字'); return false; }
      if (handleStatus === 'taken') { setError('このユーザーIDは既に使用されています'); return false; }
      const hReason = getHandleBlockReason(handle);
      if (hReason) { setError(hReason); return false; }
      if (confirmPassword !== password) {
        setError('確認用パスワードが一致しません');
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUser(cred.user.uid, displayName, cred.user.email, handle);
        await sendEmailVerification(cred.user);
        await signOut(auth);
        setInfo('仮登録です。メール内のリンクをクリックして本登録を完了してください。必要なら再送できます。');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await ensureUser(cred.user.uid, cred.user.displayName, cred.user.email);
        setInfo('ログイン成功');
      }
      if (mode !== 'register') {
        router.push('/timeline');
      }
    } catch (err: any) {
      setError(mapAuthError(err.code || 'unknown'));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await ensureUser(cred.user.uid, cred.user.displayName, cred.user.email);
      setInfo('Google ログイン成功');
      router.push('/timeline');
    } catch (err: any) {
      setError(mapAuthError(err.code || 'unknown'));
    } finally {
      setLoading(false);
    }
  }

  async function handleTwitter() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const result = await signInWithTwitter();
      if (result) {
        setInfo('X (Twitter) ログイン成功');
        router.push('/timeline');
      } else {
        setInfo('認証ページにリダイレクトしています...');
      }
    } catch (err: any) {
      setError(translateTwitterAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setConfirmPassword('');
    setError(null);
    setDisplayName('');
    setHandle('');
    setHandleStatus('idle');
    setHandleError(null);
  }

  return {
    mode,
    switchMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    displayName,
    setDisplayName,
    handle,
    setHandle,
    loading,
    error,
    info,
    showPwd,
    setShowPwd,
    showConfirm,
    setShowConfirm,
    pwdStrength,
    mismatch,
    handleStatus,
    handleError,
    handleSubmit,
    handleGoogle,
    handleTwitter,
  };
}

"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { getDisplayNameBlockReason } from '@/lib/constants/userFilters';
import type { AuthMode } from '../_lib/hooks';

interface AuthFormProps {
  mode: AuthMode;
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  handle: string;
  loading: boolean;
  error: string | null;
  info: string | null;
  showPwd: boolean;
  showConfirm: boolean;
  pwdStrength: { label: string; percent: number; cls: string };
  mismatch: string | null;
  handleStatus: 'idle' | 'checking' | 'ok' | 'taken' | 'invalid';
  handleError: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onHandleChange: (value: string) => void;
  onShowPwdToggle: () => void;
  onShowConfirmToggle: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AuthForm({
  mode,
  email,
  password,
  confirmPassword,
  displayName,
  handle,
  loading,
  error,
  info,
  showPwd,
  showConfirm,
  pwdStrength,
  mismatch,
  handleStatus,
  handleError,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onDisplayNameChange,
  onHandleChange,
  onShowPwdToggle,
  onShowConfirmToggle,
  onSubmit,
}: AuthFormProps) {
  const dnBlockReason = getDisplayNameBlockReason(displayName);

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-live="polite">
      {mode === 'register' && (
        <div>
          <label className="block text-sm font-medium mb-1">ユーザー名 (表示名 / 重複可)</label>
          <input
            type="text"
            value={displayName}
            onChange={e => onDisplayNameChange(e.target.value.slice(0, 40))}
            className="input-underline"
            disabled={loading}
            placeholder="例: VR太郎"
          />
          <ErrorMessage error={dnBlockReason} size="xs" className="mt-1" />
        </div>
      )}
      
      {mode === 'register' && (
        <div>
          <label className="block text-sm font-medium mb-1">ユーザーID (@無し / 一意)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={handle}
              onChange={e => onHandleChange(e.target.value.toLowerCase())}
              className={`input-underline flex-1 ${(handleStatus === 'taken' || handleStatus === 'invalid') ? 'error' : ''}`}
              disabled={loading}
              placeholder="例: taro_vr"
              aria-invalid={handleStatus === 'taken' || handleStatus === 'invalid'}
            />
            <span className="text-xs fg-subtle w-16">
              {handleStatus === 'idle' && ''}
              {handleStatus === 'checking' && '確認中'}
              {handleStatus === 'ok' && '利用可'}
              {handleStatus === 'taken' && '使用不可'}
              {handleStatus === 'invalid' && '形式'}
            </span>
          </div>
          <ErrorMessage error={handleError} size="xs" className="mt-1" />
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-1">メールアドレス</label>
        <input
          type="email"
          value={email}
          onChange={e => onEmailChange(e.target.value)}
          className="input-underline"
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">パスワード</label>
        <div className="flex items-center gap-2">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => onPasswordChange(e.target.value)}
            className="input-underline flex-1"
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={loading}
          />
          <button
            type="button"
            onClick={onShowPwdToggle}
            className="text-xs link-accent w-16"
            aria-label="パスワード表示切替"
          >
            {showPwd ? '隠す' : '表示'}
          </button>
        </div>
        {mode === 'login' && (
          <div className="mt-2">
            <Link href="/settings/forgot-password" className="text-xs link-accent">
              パスワードを忘れた方
            </Link>
          </div>
        )}
        {mode === 'register' && (
          <div className="mt-2 pw-strength-wrapper" aria-live="polite">
            <div className={`pw-strength-bar ${pwdStrength.cls}`}>
              <span style={{ width: pwdStrength.percent + '%' }}></span>
            </div>
            {pwdStrength.label && (
              <p className="pw-strength-label">強度: {pwdStrength.label}</p>
            )}
          </div>
        )}
      </div>
      
      {mode === 'register' && (
        <div>
          <label className="block text-sm font-medium mb-1">パスワード（確認）</label>
          <div className="flex items-center gap-2">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => onConfirmPasswordChange(e.target.value)}
              className={`input-underline flex-1 ${mismatch ? 'error' : ''}`}
              required
              autoComplete="new-password"
              disabled={loading}
              aria-invalid={!!mismatch}
            />
            <button
              type="button"
              onClick={onShowConfirmToggle}
              className="text-xs link-accent w-16"
              aria-label="確認パスワード表示切替"
            >
              {showConfirm ? '隠す' : '表示'}
            </button>
          </div>
          <ErrorMessage error={mismatch} size="xs" className="mt-1" />
        </div>
      )}
      
      <ErrorMessage error={error} />
      
      {info && (
        <div className="text-xs fg-muted surface-alt border border-base rounded p-2">
          <p>{info}</p>
          {mode === 'register' && (
            <div className="mt-2">
              <button
                type="button"
                className="text-xs link-accent"
                disabled={loading}
                onClick={() => {
                  // 再送処理
                }}
              >
                確認メールを再送
              </button>
            </div>
          )}
        </div>
      )}
      
      <Button
        type="submit"
        variant="accent"
        fullWidth
        isLoading={loading}
        disabled={loading}
      >
        {loading ? '処理中...' : (mode === 'login' ? 'ログイン' : '登録')}
      </Button>
    </form>
  );
}

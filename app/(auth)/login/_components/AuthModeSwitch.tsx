"use client";
import React from 'react';
import { Button } from '@/components/ui/Button';
import type { AuthMode } from '../_lib/hooks';

interface AuthModeSwitchProps {
  mode: AuthMode;
  loading: boolean;
  onSwitch: (mode: AuthMode) => void;
}

export function AuthModeSwitch({ mode, loading, onSwitch }: AuthModeSwitchProps) {
  return (
    <div className="flex gap-2 mb-4">
      <Button
        type="button"
        size="sm"
        variant={mode === 'login' ? 'accent' : 'ghost'}
        onClick={() => onSwitch('login')}
        disabled={loading}
      >
        ログイン
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'register' ? 'accent' : 'ghost'}
        onClick={() => onSwitch('register')}
        disabled={loading}
      >
        新規登録
      </Button>
    </div>
  );
}

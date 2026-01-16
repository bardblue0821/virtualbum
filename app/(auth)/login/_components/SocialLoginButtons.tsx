"use client";
import React from 'react';
import { Button } from '@/components/ui/Button';

interface SocialLoginButtonsProps {
  loading: boolean;
  onGoogle: () => void;
  onTwitter: () => void;
}

export function SocialLoginButtons({ loading, onGoogle, onTwitter }: SocialLoginButtonsProps) {
  return (
    <div className="mt-6 space-y-2">
      <Button
        type="button"
        variant="ghost"
        fullWidth
        isLoading={loading}
        onClick={onGoogle}
        disabled={loading}
      >
        {loading ? '...' : 'Google で続行'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        fullWidth
        isLoading={loading}
        onClick={onTwitter}
        disabled={loading}
      >
        {loading ? '...' : 'X で続行'}
      </Button>
    </div>
  );
}

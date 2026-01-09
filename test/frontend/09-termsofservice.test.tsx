/**
 * 利用規約・禁止事項ページ テスト
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';


import TermsOfServicePage from '../../app/termsofservice/page';

// テスト本体

describe('/termsofservice 利用規約ページ', () => {
  test('ページタイトル・バージョン・日付が表示される', () => {
  render(<TermsOfServicePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('利用規約');
    expect(screen.getByTestId('policy-version')).toHaveTextContent('v1.0 / 2026-01-09');
  });

    test('禁止事項の大見出しが表示される', () => {
      render(<TermsOfServicePage />);
      expect(screen.getByRole('heading', { level: 2, name: '禁止事項' })).toBeInTheDocument();
    });

  test('違反時の対応方針が表示される', () => {
  render(<TermsOfServicePage />);
    expect(screen.getByRole('heading', { level: 2, name: '違反時の対応' })).toBeInTheDocument();
    expect(screen.getByText(/警告・アカウント停止/)).toBeInTheDocument();
  });

  test('未ログイン状態でも閲覧可能（認証不要）', () => {
    // 認証状態に依存しない静的ページであることを確認
  render(<TermsOfServicePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('利用規約');
  });
});

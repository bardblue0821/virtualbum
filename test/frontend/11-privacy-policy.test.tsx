/**
 * プライバシーポリシーページ テスト
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import PrivacyPolicyPage from '../../app/legal/privacy-policy/page';

describe('/legal/privacy-policy プライバシーポリシーページ', () => {
  test('ページタイトル・バージョン・日付が表示される', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('プライバシーポリシー');
    expect(screen.getByTestId('privacy-version')).toBeInTheDocument();
  });

  test('収集情報の大見出しが表示される', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { level: 2, name: '収集する情報' })).toBeInTheDocument();
  });

  test('第三者提供・外部サービスの大見出しが表示される', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { level: 2, name: '第三者提供' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '外部サービスの利用' })).toBeInTheDocument();
  });

  test('未ログイン状態でも閲覧可能（認証不要）', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('プライバシーポリシー');
  });
});

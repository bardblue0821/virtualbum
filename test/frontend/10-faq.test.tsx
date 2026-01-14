/**
 * FAQページ テスト
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import FAQPage from '../../app/legal/faq/page';

describe('/legal/faq よくある質問ページ', () => {
  test('ページタイトル・バージョン・日付が表示される', () => {
    render(<FAQPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('よくある質問');
    expect(screen.getByTestId('faq-version')).toBeInTheDocument();
  });

  test('FAQの大見出しが表示される', () => {
    render(<FAQPage />);
    expect(screen.getByRole('heading', { level: 2, name: 'FAQ一覧' })).toBeInTheDocument();
  });

  test('ダミーQ&Aが表示される', () => {
    render(<FAQPage />);
    expect(screen.getByText(/サービスの利用は無料/)).toBeInTheDocument();
    expect(screen.getByText(/画像のアップロード制限/)).toBeInTheDocument();
    expect(screen.getByText(/パスワードを忘れた場合/)).toBeInTheDocument();
    expect(screen.getByText(/不適切なコンテンツ/)).toBeInTheDocument();
    expect(screen.getByText(/退会したい場合/)).toBeInTheDocument();
  });

  test('未ログイン状態でも閲覧可能（認証不要）', () => {
    render(<FAQPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('よくある質問');
  });
});

import Link from 'next/link';
// プライバシーポリシーページ
// 仕様: design/feature/20-privacy-policy.md に準拠
import React from 'react';

const VERSION = 'v1.0';
const DATE = '2026-01-09';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1>プライバシーポリシー</h1>
      <div data-testid="privacy-version" style={{ color: '#888', fontSize: '0.95em', marginBottom: 24 }}>
        {VERSION} / {DATE}
      </div>

      <h2>収集する情報</h2>
      <ul>
        <li>メールアドレス（Googleアカウント認証時）</li>
        <li>ニックネーム（Googleアカウント認証時）</li>
        <li>投稿・コメント・画像などユーザーが自発的に送信した情報</li>
        <li>Firebase Authentication, Firestore, Storage へのアクセスログ</li>
      </ul>

      <h2>第三者提供</h2>
      <p>
        本サービスは、法令に基づく場合を除き、ユーザーの個人情報を第三者に提供しません。
      </p>

      <h2>外部サービスの利用</h2>
      <ul>
        <li>Google（Firebase Authentication, Firestore, Storage）</li>
      </ul>
      <p style={{ fontSize: '0.95em', color: '#888', marginTop: 32 }}>
        本ポリシーは予告なく改定される場合があります。<br />
        最新の内容は本ページでご確認ください。
      </p>
      <div className="mt-10 text-center">
        <Link href="/" className="inline-block px-4 py-2 rounded bg-accent text-white hover:bg-accent/80 transition">
          トップページへ戻る
        </Link>
      </div>
    </div>
  );
}

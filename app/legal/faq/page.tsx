import Link from 'next/link';
// FAQページ
// 仕様: design/feature/21-faq.md に準拠
import React from 'react';

const VERSION = 'v1.0';
const DATE = '2026-01-09';

export default function FAQPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1>よくある質問</h1>
      <div data-testid="faq-version" style={{ color: '#888', fontSize: '0.95em', marginBottom: 24 }}>
        {VERSION} / {DATE}
      </div>

      <h2>FAQ一覧</h2>

      <section>
        <h3>Q: サービスの利用は無料ですか？</h3>
        <p>A: はい、無料でご利用いただけます。</p>
      </section>
      <section>
        <h3>Q: 画像のアップロード制限はありますか？</h3>
        <p>A: 1枚あたり最大20MB、1度に最大４枚までアップロード可能です。</p>
      </section>
      <section>
        <h3>Q: パスワードを忘れた場合はどうすればいいですか？</h3>
        <p>A: ログイン画面の「パスワードを忘れた方」から再設定できます。</p>
      </section>
      <section>
        <h3>Q: 不適切なコンテンツを見つけた場合の通報方法は？</h3>
        <p>A: 各投稿の「通報」ボタンから運営に連絡できます。</p>
      </section>
      <section>
        <h3>Q: 退会したい場合は？</h3>
        <p>A: 設定画面からアカウント削除が可能です。</p>
      </section>
      <p style={{ fontSize: '0.95em', color: '#888', marginTop: 32 }}>
        本FAQは予告なく改定される場合があります。<br />
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

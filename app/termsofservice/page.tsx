import React from "react";
import Link from "next/link";

const POLICY_VERSION = "v1.0";
const POLICY_DATE = "2026-01-09";

export default function TermsOfServicePage() {
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">利用規約</h1>
        <div className="text-sm text-gray-500" data-testid="policy-version">
          {POLICY_VERSION} / {POLICY_DATE}
        </div>
      </header>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">禁止事項</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>迷惑行為（例：他者への嫌がらせ、誹謗中傷、差別的発言など）</li>
          <li>法令違反（例：違法コンテンツの投稿、犯罪行為の助長など）</li>
          <li>スパム投稿・宣伝目的の投稿</li>
          <li>著作権・知的財産権の侵害</li>
          <li>なりすまし（他人の名前・情報を使った登録・投稿）</li>
          <li>個人情報の不正取得・公開</li>
          <li>その他、運営が不適切と判断する行為</li>
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">違反時の対応</h2>
        <p>禁止事項に違反した場合、警告・アカウント停止等の措置を行う場合があります。</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">改定履歴</h2>
        <ul className="list-disc pl-6">
          <li>v1.0 / 2026-01-09 初版公開</li>
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">編集・公開について</h2>
        <p>本ページは管理者（開発者）のみ編集可能です。内容は予告なく改定される場合があります。</p>
      </section>
      <div className="mt-10 text-center">
        <Link href="/" className="inline-block px-4 py-2 rounded bg-accent text-white hover:bg-accent/80 transition">
          トップページへ戻る
        </Link>
      </div>
    </main>
  );
}

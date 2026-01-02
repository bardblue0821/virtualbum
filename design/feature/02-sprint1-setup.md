# スプリント１: 開発環境準備

## 手順
1. 開発環境準備  
   - Node.js と VS Code をインストール  
   - npx create-next-app@latest instavram （TypeScript / Tailwind 有効）  
   - cd instavram

2. Firebase プロジェクト作成（Firestore / Storage / Auth 有効化）  
   2-1. プロジェクト作成  
       - ブラウザで https://console.firebase.google.com を開く  
       - 「プロジェクトを追加」→ 任意のプロジェクト名入力 → 規約同意 → Google Analytics は最初はオフで可 → 作成完了待ち  
   
   2-2. Web アプリの追加  
       - プロジェクトホームで「アプリを追加」→ Web(</>) を選択  
       - アプリ名入力（例: instavram-web）→ Firebase Hosting は後でで可 → 「登録」  
       - 表示された設定スニペット（firebaseConfig）をコピー（後で src/lib/firebase.ts に貼る）  
       
   2-3. Authentication 有効化  
       - 左メニュー「Authentication」→「はじめる」  
       - 「サインイン方法」タブで「メール/パスワード」をクリック→有効化→保存  
       - 「Google」をクリック→有効化→プロジェクト公開名を確認（project-244098860504）→保存  
       
   2-4. Firestore 有効化  
       - 左メニュー「Firestore データベース」→「データベースを作成」  
       - モード選択画面で「テストモード」→（警告が出るが期限内にルール変更予定）→ 次へ  
       - リージョンはアプリ利用地域に近いもの（例: asia-northeast1）を選択 → 作成完了待ち  
       
   2-5. Storage 有効化  
       - 左メニュー「Storage」→「使ってみる」  
       - リージョンは Firestore と同じに揃える → 作成  
       
   2-6. API キー等確認  
       - 左上「プロジェクトの設定」(歯車) →「全般」→「マイアプリ」にある Web アプリ欄の「SDK設定と構成」から firebaseConfig を再確認  
       - 以下キーを .env.local に貼る  
         NEXT_PUBLIC_FIREBASE_API_KEY=...  
         NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...  
         NEXT_PUBLIC_FIREBASE_PROJECT_ID=...  
         NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...  
         NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...  
         NEXT_PUBLIC_FIREBASE_APP_ID=...  

3. 依存追加  
   - npm install firebase react-firebase-hooks  
   
4. Firebase 初期化ファイル作成 (lib/firebase.ts)
   [詳細手順は元の内容を参照]

5. データ構造（Firestore の例）  
   - users { uid, displayName, iconURL, bio, createdAt }  
   - albums { id, ownerId, title?, placeUrl?, createdAt, updatedAt }  
   - albumImages { id, albumId, uploaderId, url, createdAt }  
   - comments { id, albumId, userId, body, createdAt }  
   - likes { id, albumId, userId }  
   - friends { id, userId, targetId, status }  
   - watches { id, userId, ownerId }

6. 認証画面 /login
   [詳細手順は元の内容を参照]

7. 共通レイアウト  
   - ヘッダー: ログイン状態 / プロフィール遷移 / アルバム作成ボタン常駐

8. アルバム作成フロー
   [詳細手順は元の内容を参照]

9. 一旦デプロイ
   [詳細手順は元の内容を参照]

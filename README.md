# Strawberry Farm Chat 🍓

リアルタイムチャットサービス。Firebase AuthenticationとFirestoreを使用したモダンなチャットアプリケーションです。

## 機能

- ✅ メールアドレス/パスワードでの新規登録・ログイン
- ✅ Googleアカウントでのワンクリックログイン
- ✅ トップページから機能選択（チャット、個人設定など）
- ✅ 個人設定（年齢、1日の相談回数、メール通知設定）
- ✅ リアルタイムチャット機能
- ✅ 画像とテキストの投稿機能
- ✅ 管理者ページ（投稿の一括管理・タグ付け・統合）
- ✅ タグ管理機能（チャプター名として使用）
- ✅ レスポンシブデザイン

## セットアップ

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. **Authentication** を有効化：
   - **Sign-in method** タブで以下を有効化：
     - Email/Password
     - Google
4. **Firestore Database** を作成：
   - テストモードで開始（開発環境の場合）
   - ロケーションを選択
5. **Storage** を有効化：
   - **Storage** タブで **始める** をクリック
   - テストモードで開始（開発環境の場合）
   - ロケーションを選択

### 2. Firebase設定の追加

1. Firebase Console の **プロジェクト設定** → **全般** タブ
2. **マイアプリ** セクションで **Web** アイコンをクリック
3. アプリ名を入力して登録
4. 表示される設定値をコピー

5. `index.html` の以下の部分を実際の設定値に置き換え：

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Firestoreのセキュリティルール設定

Firestore Database の **ルール** タブで以下を設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /tags/{tagId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // 管理者チェックはアプリ側で実装
    }
  }
}
```

### 4. Storageのセキュリティルール設定

Storage の **ルール** タブで以下を設定：

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chat-images/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. ローカルで実行

```bash
# シンプルなHTTPサーバーで実行（Python 3の場合）
python3 -m http.server 8000

# または Node.js の http-server を使用
npx http-server -p 8000
```

ブラウザで `http://localhost:8000` にアクセス

### 5. 管理者権限の設定

管理者として設定するには、Firestore Consoleで以下のように設定します：

1. Firestore Database の **データ** タブに移動
2. `users` コレクションを作成（存在しない場合）
3. 管理者にしたいユーザーのUIDでドキュメントを作成
4. 以下のフィールドを追加：
   - `role`: `"admin"` （文字列）

例：
```
users/{userId}
  role: "admin"
```

管理者としてログインすると、トップページに「管理者ページ」カードが表示されます。

## 管理者機能

管理者ページでは以下の機能が利用できます：

### タグ管理（チャプター名）
- 新しいタグ（チャプター名）を追加
- 既存のタグを削除
- タグは教科書作成時のチャプター名として使用されます

### 投稿管理
- 過去のすべての投稿を一覧表示
- 各投稿にタグを付与
- タグによるフィルタリング
- テキスト検索
- 複数の投稿を選択して統合

### 質問の統合
- 似たような質問を選択して統合
- 統合時にすべてのタグが統合先の投稿に追加されます
- 統合元の投稿は `isMerged: true` としてマークされます

## 仮想サーバへのデプロイ

仮想サーバ（VPS、AWS EC2、GCP、Azureなど）にデプロイする場合は、[DEPLOY.md](DEPLOY.md)を参照してください。

主な手順：
1. Nginxをインストール
2. ファイルをサーバーにアップロード
3. Nginx設定ファイルを配置
4. SSL証明書を設定（Let's Encrypt推奨）

詳細は `DEPLOY.md` を参照してください。

## GitHubとの連携

### リポジトリの接続

このリポジトリは `consultation-service` リポジトリにプッシュされています。

### GitHub Pagesの設定

このプロジェクトはGitHub Pagesで自動デプロイされるように設定されています。

1. GitHubリポジトリの **Settings** → **Pages** に移動
2. **Source** で **GitHub Actions** を選択
3. `main` ブランチにプッシュすると、自動的にGitHub Pagesにデプロイされます
4. デプロイ後、`https://doraemon0218.github.io/consultation-service/` でアクセスできます

参考: [consultation-serviceの例](https://doraemon0218.github.io/consultation-service/)

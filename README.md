# Strawberry Farm

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

## GitHubとの連携

### リポジトリの接続

このリポジトリをGitHubに接続するには：

1. GitHubで新しいリポジトリを作成
2. 以下のコマンドを実行：

```bash
git remote add origin https://github.com/YOUR_USERNAME/strawberryfarm.git
git branch -M main
git push -u origin main
```

### GitHub Pagesの設定

このプロジェクトはGitHub Pagesで自動デプロイされるように設定されています。

1. GitHubリポジトリの **Settings** → **Pages** に移動
2. **Source** で **GitHub Actions** を選択
3. `main` ブランチにプッシュすると、自動的にGitHub Pagesにデプロイされます
4. デプロイ後、`https://YOUR_USERNAME.github.io/strawberryfarm/` でアクセスできます

参考: [consultation-serviceの例](https://doraemon0218.github.io/consultation-service/)


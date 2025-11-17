# 仮想サーバへのデプロイ手順

このアプリケーションを仮想サーバ（VPS、AWS EC2、GCP、Azureなど）にデプロイする手順です。

## 前提条件

- Ubuntu 20.04 または 22.04（推奨）
- SSHアクセス可能
- sudo権限

## 1. サーバーの準備

### Nginxのインストール

```bash
sudo apt update
sudo apt install -y nginx
```

### ディレクトリの作成

```bash
sudo mkdir -p /var/www/strawberryfarm
sudo chown -R $USER:$USER /var/www/strawberryfarm
```

## 2. ファイルのアップロード

### 方法1: rsyncを使用（推奨）

```bash
# ローカルから実行
rsync -avz --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.DS_Store' \
    ./ user@your-server-ip:/var/www/strawberryfarm/
```

### 方法2: SCPを使用

```bash
scp -r * user@your-server-ip:/var/www/strawberryfarm/
```

### 方法3: Gitを使用

```bash
# サーバー上で実行
cd /var/www/strawberryfarm
git clone https://github.com/doraemon0218/consultation-service.git .
```

## 3. Nginxの設定

### 設定ファイルの作成

```bash
sudo nano /etc/nginx/sites-available/strawberryfarm
```

以下の内容を貼り付け（`your-domain.com`を実際のドメインに変更）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/strawberryfarm;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### 設定を有効化

```bash
sudo ln -sf /etc/nginx/sites-available/strawberryfarm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 4. SSL証明書の設定（Let's Encrypt）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 5. ファイアウォールの設定

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

## 6. 自動デプロイスクリプトの使用

`deploy.sh`スクリプトを使用して自動デプロイ：

```bash
chmod +x deploy.sh
./deploy.sh user@your-server-ip /var/www/strawberryfarm
```

## 7. Firebase設定の確認

サーバーにデプロイ後、`index.html`のFirebase設定が正しく設定されているか確認してください。

## トラブルシューティング

### Nginxが起動しない

```bash
sudo nginx -t  # 設定ファイルの構文チェック
sudo systemctl status nginx  # ステータス確認
sudo journalctl -u nginx  # ログ確認
```

### ファイルの権限エラー

```bash
sudo chown -R www-data:www-data /var/www/strawberryfarm
sudo chmod -R 755 /var/www/strawberryfarm
```

### ポート80が使用できない

```bash
sudo netstat -tulpn | grep :80  # 使用中のプロセスを確認
```

## 更新手順

ファイルを更新する場合：

```bash
# 方法1: rsyncで再アップロード
rsync -avz --delete ./ user@your-server-ip:/var/www/strawberryfarm/

# 方法2: Gitで更新
cd /var/www/strawberryfarm
git pull origin main
```

## パフォーマンス最適化

### Nginxキャッシュの設定

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;
```

### 静的ファイルのCDN利用

静的ファイル（CSS、JS、画像）をCDN（Cloudflare、AWS CloudFrontなど）に配置することで、パフォーマンスを向上できます。


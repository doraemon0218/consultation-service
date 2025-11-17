#!/bin/bash

# 仮想サーバへのデプロイスクリプト
# 使用方法: ./deploy.sh user@server-ip /var/www/strawberryfarm

set -e

# 引数の確認
if [ $# -lt 2 ]; then
    echo "使用方法: $0 <user@server-ip> <deploy-path>"
    echo "例: $0 ubuntu@192.168.1.100 /var/www/strawberryfarm"
    exit 1
fi

SERVER=$1
DEPLOY_PATH=$2

echo "🚀 デプロイを開始します..."
echo "サーバー: $SERVER"
echo "デプロイ先: $DEPLOY_PATH"

# サーバーに接続してディレクトリを作成
ssh $SERVER "sudo mkdir -p $DEPLOY_PATH && sudo chown -R \$(whoami):\$(whoami) $DEPLOY_PATH"

# ファイルをアップロード
echo "📦 ファイルをアップロード中..."
rsync -avz --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.DS_Store' \
    --exclude 'deploy.sh' \
    --exclude 'nginx.conf' \
    ./ $SERVER:$DEPLOY_PATH/

# Nginx設定ファイルをコピー（オプション）
echo "⚙️  Nginx設定を確認中..."
ssh $SERVER "if [ -f $DEPLOY_PATH/nginx.conf ]; then
    echo 'Nginx設定ファイルが見つかりました。手動で設定してください:'
    echo 'sudo cp $DEPLOY_PATH/nginx.conf /etc/nginx/sites-available/strawberryfarm'
    echo 'sudo ln -sf /etc/nginx/sites-available/strawberryfarm /etc/nginx/sites-enabled/'
    echo 'sudo nginx -t && sudo systemctl reload nginx'
fi"

echo "✅ デプロイが完了しました！"
echo "ブラウザで http://$SERVER にアクセスしてください"


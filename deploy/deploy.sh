#!/bin/bash
# ============================================
# 饮品下单系统 - 服务器部署脚本
# 使用方法:
#   1. 在服务器上: chmod +x deploy.sh && ./deploy.sh
#   2. 或者分步执行下面的命令
# ============================================

set -e

# === 配置变量 (根据你的服务器修改) ===
PROJECT_DIR="/opt/beverage-order"
SERVER_IP="118.24.104.69"
MYSQL_ROOT_PASS="your_db_password"

echo "=========================================="
echo "  饮品下单系统 - 一键部署"
echo "=========================================="

# 1. 安装基础依赖 (Ubuntu/Debian)
echo ""
echo "[1/7] 安装 Node.js 和 MySQL..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
if ! command -v mysql &> /dev/null; then
    apt-get install -y mysql-server
fi
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi

# 2. 创建项目目录
echo ""
echo "[2/7] 创建项目目录..."
mkdir -p $PROJECT_DIR
mkdir -p $PROJECT_DIR/logs
mkdir -p $PROJECT_DIR/uploads

# 3. 配置 MySQL
echo ""
echo "[3/7] 配置 MySQL 数据库..."
mysql -u root -p"$MYSQL_ROOT_PASS" <<SQL
CREATE DATABASE IF NOT EXISTS beverage_order CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'beverage'@'localhost' IDENTIFIED BY 'beverage123!';
GRANT ALL PRIVILEGES ON beverage_order.* TO 'beverage'@'localhost';
FLUSH PRIVILEGES;
SQL

# 4. 克隆/更新代码 (使用 Github)
echo ""
echo "[4/7] 部署代码..."
# 第一次部署: git clone 你的仓库地址 $PROJECT_DIR
# 后续更新:
#   cd $PROJECT_DIR && git pull

# 5. 配置环境变量
echo ""
echo "[5/7] 配置环境变量..."
cat > $PROJECT_DIR/server/.env <<ENVEOF
DATABASE_URL="mysql://beverage:beverage123!@localhost:3306/beverage_order"
JWT_SECRET="$(openssl rand -hex 32)"
JWT_EXPIRES_IN="7d"
UPLOAD_DIR="./uploads"
PORT=3000
ENVEOF

# 6. 安装依赖 + 构建
echo ""
echo "[6/7] 安装依赖并构建..."
cd $PROJECT_DIR/server
npm install
npx prisma generate
npx prisma migrate deploy

# 构建管理后台
cd $PROJECT_DIR/admin
npm install
# 修改 src/config.ts 中的 API_BASE_URL 指向服务器 IP
sed -i "s|http://localhost:3000|http://${SERVER_IP}:3000|g" src/config.ts
npm run build

# 7. 启动服务
echo ""
echo "[7/7] 启动服务..."
cd $PROJECT_DIR
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "  服务端口:"
echo "    API:  http://${SERVER_IP}:3000/api"
echo "    管理后台: http://${SERVER_IP}:3000 (需配置 Nginx 静态文件)"
echo ""
echo "  常用命令:"
echo "    pm2 status         查看服务状态"
echo "    pm2 logs           查看日志"
echo "    pm2 restart all    重启服务"
echo ""
echo "  本地开发时, 修改以下文件中的 API_BASE_URL:"
echo "    admin/src/config.ts     →  http://${SERVER_IP}:3000"
echo "    miniapp/src/config.ts   →  http://${SERVER_IP}:3000"
echo ""

# 饮品下单系统 — Ubuntu 服务器部署指南

> 服务器 IP: 118.24.104.69  
> 代码仓库: https://github.com/Mrcrossove/yingping

---

## 前提条件

登录服务器后，确保你拥有 root 权限：

```bash
ssh root@118.24.104.69
```

---

## 第一步：安装基础软件

```bash
# 更新包管理器
apt update && apt upgrade -y

# 安装 Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 验证安装
node -v
npm -v

# 安装 PM2 进程管理器 (全局)
npm install -g pm2

# 安装 Git
apt install -y git

# 安装 MySQL
apt install -y mysql-server
```

---

## 第二步：配置 MySQL 数据库

```bash
# 启动 MySQL
systemctl start mysql
systemctl enable mysql

# 设置 MySQL root 密码并创建数据库
mysql -u root <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Yingpin2024!';
CREATE DATABASE IF NOT EXISTS beverage_order CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
FLUSH PRIVILEGES;
SQL
```

> 密码 `Yingpin2024!` 请改为你自己的安全密码

---

## 第三步：克隆项目代码

```bash
mkdir -p /opt
cd /opt

git clone https://github.com/Mrcrossove/yingping.git beverage-order
cd /opt/beverage-order
```

---

## 第四步：配置后端环境变量

```bash
cd /opt/beverage-order/server

cp .env.example .env

# 编辑 .env 文件，填入数据库密码
# nano .env  或  vim .env
```

修改 `.env` 中 DATABASE_URL 为：
```
DATABASE_URL="mysql://root:Yingpin2024!@localhost:3306/beverage_order"
JWT_SECRET="yingpin-jwt-secret-change-me-to-random-string"
JWT_EXPIRES_IN="7d"
UPLOAD_DIR="./uploads"
PORT=3000
```

---

## 第五步：安装依赖并初始化数据库

```bash
cd /opt/beverage-order/server

npm install

# 生成 Prisma 客户端
npx prisma generate

# 执行数据库迁移（建表）
npx prisma migrate dev --name init

# 构建 NestJS 项目
npm run build
```

---

## 第六步：启动后端服务

```bash
cd /opt/beverage-order

# 创建日志目录
mkdir -p logs

# 用 PM2 启动
pm2 start deploy/ecosystem.config.js

# 设置 PM2 开机自启
pm2 save
pm2 startup
# 执行屏幕上输出的 sudo 命令来完成自启配置

# 查看服务状态
pm2 status

# 查看日志
pm2 logs beverage-server
```

---

## 第七步：配置防火墙

```bash
# 放行 API 端口 3000
ufw allow 3000/tcp

# 放行 SSH 端口 (避免把自己锁在外面!)
ufw allow 22/tcp

# 开启防火墙
ufw enable

# 查看状态
ufw status
```

---

## 第八步：验证部署

在本地浏览器访问以下地址验证 API 是否正常运行：

```
http://118.24.104.69:3000/api/auth/login
```

如果返回 JSON 响应而非连接错误，说明部署成功。

---

## 本地开发切换

部署完成后，本地开发时修改以下两个文件即可切换回本地 API：

```
admin/src/config.ts    → API_BASE_URL = 'http://localhost:3000'
miniapp/src/config.ts  → API_BASE_URL = 'http://localhost:3000'
```

---

## 常用运维命令

| 操作 | 命令 |
|------|------|
| 查看服务状态 | `pm2 status` |
| 查看日志 | `pm2 logs beverage-server` |
| 重启服务 | `pm2 restart beverage-server` |
| 停止服务 | `pm2 stop beverage-server` |
| 更新代码 | `cd /opt/beverage-order && git pull && cd server && npm run build && cd .. && pm2 restart beverage-server` |
| 查看端口占用 | `lsof -i :3000` |

---

## 后续优化建议

1. **域名 + HTTPS**：注册域名后配置 Nginx + Let's Encrypt SSL 证书，微信小程序才能真机调试
2. **Nginx 反代**：将 Nginx 放在前端监听 80/443，反向代理到 localhost:3000
3. **MySQL 安全**：限制 MySQL 只监听 `127.0.0.1`，不使用弱密码
4. **日志轮转**：配置 logrotate 防止日志文件过大

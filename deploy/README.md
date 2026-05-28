# 服务器上部署时执行:
# 将项目上传到 /opt/beverage-order 后:

# 安装依赖
cd /opt/beverage-order/server && npm install
npx prisma generate
npx prisma migrate deploy

# 构建管理后台 (提前修改 admin/src/config.ts 的 API_BASE_URL)
cd /opt/beverage-order/admin && npm install && npm run build

# 启动
cd /opt/beverage-order
pm2 start deploy/ecosystem.config.js
pm2 save

# 饮品下单系统

> 饮品下单小程序 + 管理后台 全栈项目

## 项目结构

```
beverage-order/
├── server/      # NestJS 后端 API (端口 3000)
├── admin/       # Vue3 + Element Plus 管理后台 (端口 5173)
├── miniapp/     # uni-app 微信小程序
└── deploy/      # 服务器部署配置
```

## 技术栈

| 层面 | 技术 |
|------|------|
| 后端 | NestJS + Prisma + MySQL + JWT + WebSocket |
| 管理后台 | Vue3 + TypeScript + Element Plus + Vite |
| 小程序 | uni-app (Vue3) + Pinia |

## 本地开发

```bash
# 后端
cd server
cp .env.example .env   # 编辑数据库连接
npm install
npx prisma migrate dev
npm run dev

# 管理后台
cd admin
npm install
npm run dev

# 小程序
cd miniapp
npm install
npm run dev:mp-weixin
```

## 服务器部署

详见 `deploy/` 目录下的部署脚本和配置。

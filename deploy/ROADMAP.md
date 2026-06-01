# 饮品下单系统 — 商用版本路线图

> 当前状态: MVP 功能完成 (后端 15 模块 + 管理后台 9 页 + 小程序 11 页)  
> 目标: 达到可上线运营的商用版本

---

## 一、当前差距评估

| 维度 | 当前状态 | 商用要求 | 差距 |
|------|---------|---------|------|
| 登录 | 账号密码 | 微信一键登录 (wx.login) | 🔴 必须 |
| 域名 | 无域名，IP 直连 | 备案域名 + HTTPS | 🔴 必须 |
| 支付 | 无 | 微信支付 | 🟠 核心 |
| 通知 | WebSocket (已集成) | + 微信模板消息/短信 | 🟠 重要 |
| 测试 | 0 测试 | 单元测试 + E2E 测试 | 🟡 质量 |
| 监控 | 无 | 错误监控 + 日志系统 | 🟡 运维 |
| CI/CD | 手动部署 | GitHub Actions 自动部署 | 🟡 效率 |
| API 文档 | 无 | Swagger 自动文档 | 🟡 协作 |

---

## 二、分阶段规划

### Phase 1: 上线基础 (必须完成)
```
目标: 小程序能通过微信审核上架，真实商户可使用
预计: 2-3 天
```

| # | 任务 | 改动范围 | 优先级 |
|---|------|---------|--------|
| 1.1 | 注册域名 + 配置 SSL 证书 (Let's Encrypt) | 运维 | P0 |
| 1.2 | Nginx 配置 HTTPS 反向代理 | `deploy/nginx.conf` | P0 |
| 1.3 | 微信小程序注册 + AppID 配置 + 域名白名单 | 微信后台 + `manifest.json` | P0 |
| 1.4 | 微信登录 (wx.login → 服务端 code2session) | `server/Auth` + `miniapp/login` | P0 |
| 1.5 | 手机号授权绑定 | `server/Auth` + `miniapp/mine` | P1 |
| 1.6 | API 安全加固 (Rate Limiting, XSS, SQL注入) | `server/main.ts` + Guards | P1 |
| 1.7 | 数据库自动备份脚本 (crontab) | `deploy/backup.sh` | P1 |
| 1.8 | 生成真实商品图片 + 初始化 SEO 数据 | 设计 + 管理后台 | P1 |

### Phase 2: 核心商业闭环 (支付 + 通知)
```
目标: 完成交易闭环，订单可付费，状态可通知
预计: 2-3 天
```

| # | 任务 | 改动范围 | 优先级 |
|---|------|---------|--------|
| 2.1 | 微信支付接入 (JSAPI 支付) | `server/Payment` + `miniapp/order` | P0 |
| 2.2 | 退款流程 | `server/Payment` | P1 |
| 2.3 | 微信模板消息 (订单状态推送) | `server/Notification` 扩展 | P1 |
| 2.4 | 推广员二维码真实生成 (wxacode) | `server/Promotion` + `miniapp` | P1 |
| 2.5 | 商户收货地址管理 (真实现页) | `server/Address` + `miniapp/address` | P2 |
| 2.6 | 订单评价系统 | `server/Review` + `miniapp` | P2 |

### Phase 3: 管理增强
```
目标: 管理员能力升级，数据驱动决策
预计: 2-3 天
```

| # | 任务 | 改动范围 | 优先级 |
|---|------|---------|--------|
| 3.1 | 操作审计日志 | `server/AuditLog` + 新表 | P1 |
| 3.2 | 数据可视化升级 (ECharts 完整报表) | `admin/Dashboard` | P1 |
| 3.3 | 批量操作 (批量派单/批量审核) | `server/Order` + `admin` | P2 |
| 3.4 | 库存预警 + 补货提醒 | `server/Product` | P2 |
| 3.5 | Swagger API 文档自动生成 | `server/main.ts` | P2 |
| 3.6 | 商家自主注册 + 审核流程 | `server/Auth` + `admin` | P2 |

### Phase 4: 质量与运维
```
目标: 系统稳定可靠，可持续迭代
预计: 2-3 天
```

| # | 任务 | 改动范围 | 优先级 |
|---|------|---------|--------|
| 4.1 | 后端单元测试 (Jest) | `server/**/*.spec.ts` | P1 |
| 4.2 | E2E 核心流程测试 | `server/test/` | P1 |
| 4.3 | ESLint + Prettier 代码规范 | 根目录配置 | P2 |
| 4.4 | GitHub Actions CI/CD 自动部署 | `.github/workflows/` | P2 |
| 4.5 | Sentry 错误监控接入 | `server/main.ts` + `miniapp` | P2 |
| 4.6 | 压测 + 性能优化 (Redis 缓存) | 运维 | P3 |
| 4.7 | 多环境配置 (dev/staging/prod) | `.env` 拆分 | P3 |

---

## 三、建议立即开始的任务序列

**本周可做**（无需外部依赖）:

1. Nginx HTTPS 配置（需域名）
2. 微信登录改造
3. Swagger API 文档
4. 数据库备份脚本
5. 操作审计日志表 + 中间件
6. 后端单元测试框架搭建

**需要外部资源的**:
- 微信商户号 → 微信支付
- ICP 备案域名 → HTTPS
- 微信小程序审核 → 上架

---

## 四、技术债务清单

| 问题 | 位置 | 影响 |
|------|------|------|
| 小程序 Mock 数据未替换为真实 API | `miniapp/src/mock/` | 首页/订单/我的页展示假数据 |
| admin `request.ts` GET 参数 double-wrap | `admin/src/utils/request.ts:45` | 参数传递可能异常 |
| uni-app 使用 alpha 版本依赖 | `miniapp/package.json` | 版本不稳定 |
| 无请求参数验证 DTO (仅 auth 有) | `server/*/controller` | 缺少校验 |
| 价格/金额使用 Decimal 需前端转换 | 全局 | 精度问题 |
| WebSocket 缺少重连机制 | `miniapp` | 断网无法恢复 |
| 无分页默认返回全量 (部分列表) | 部分 API | 大数据量性能 |

import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/',
      component: () => import('@/views/layout/MainLayout.vue'),
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '数据看板', icon: 'DataBoard' },
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import('@/views/Orders.vue'),
          meta: { title: '订单管理', icon: 'Document' },
        },
        {
          path: 'orders/:id',
          name: 'OrderDetail',
          component: () => import('@/views/OrderDetail.vue'),
          meta: { title: '订单详情', hidden: true },
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('@/views/Products.vue'),
          meta: { title: '商品管理', icon: 'Goods' },
        },
        {
          path: 'banners',
          name: 'Banners',
          component: () => import('@/views/Banners.vue'),
          meta: { title: '轮播图管理', icon: 'Picture' },
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/Users.vue'),
          meta: { title: '员工管理', icon: 'User' },
        },
        {
          path: 'commissions',
          name: 'Commissions',
          component: () => import('@/views/Commissions.vue'),
          meta: { title: '提成设置', icon: 'Money' },
        },
        {
          path: 'withdrawals',
          name: 'Withdrawals',
          component: () => import('@/views/Withdrawals.vue'),
          meta: { title: '提现审核', icon: 'BankCard' },
        },
        {
          path: 'promotion',
          name: 'Promotion',
          component: () => import('@/views/Promotion.vue'),
          meta: { title: '推广管理', icon: 'Share' },
        },
        {
          path: 'permissions',
          name: 'Permissions',
          component: () => import('@/views/Permissions.vue'),
          meta: { title: '权限管理', icon: 'Lock' },
        },
        {
          path: 'audit-logs',
          name: 'AuditLogs',
          component: () => import('@/views/AuditLogs.vue'),
          meta: { title: '操作日志', icon: 'List' },
        },
        {
          path: 'payments',
          name: 'Payments',
          component: () => import('@/views/Payments.vue'),
          meta: { title: '支付记录', icon: 'Wallet' },
        },
        {
          path: 'merchant-approvals',
          name: 'MerchantApprovals',
          component: () => import('@/views/MerchantApprovals.vue'),
          meta: { title: '商户审核', icon: 'Checked' },
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router

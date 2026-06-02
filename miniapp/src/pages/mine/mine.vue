<template>
  <view class="page">
    <view class="login-panel" v-if="!userLoggedIn">
      <text class="login-title">饮品下单系统</text>
      <text class="login-desc">登录后查看订单、收益和账户服务</text>
      <button class="wx-login-btn" @click="handleWxLogin" :loading="wxLoading">微信用户一键登录</button>
      <text class="account-toggle" @click="showAccountLogin = !showAccountLogin">账号密码登录</text>
      <view v-if="showAccountLogin" class="account-form">
        <input v-model="loginForm.username" placeholder="账号" class="form-input" />
        <input v-model="loginForm.password" type="password" placeholder="密码" class="form-input" />
        <button class="account-login-btn" @click="handleAccountLogin">登录</button>
      </view>
    </view>

    <view class="user-card" v-else>
      <view class="uc-top">
        <view class="avatar">{{ avatarText }}</view>
        <view class="uc-info">
          <text class="uc-name">{{ displayUser.realName }}</text>
          <view class="uc-tags">
            <text class="uc-role" :style="{ background: roleColor }">{{ roleLabel }}</text>
            <text class="uc-phone" v-if="displayUser.phone">{{ displayUser.phone }}</text>
          </view>
        </view>
      </view>

      <view class="uc-earnings" v-if="showEarnings">
        <view class="earn-item">
          <text class="earn-val">¥{{ earnings.pendingAmount.toLocaleString() }}</text>
          <text class="earn-label">待结算</text>
        </view>
        <view class="earn-divider"></view>
        <view class="earn-item">
          <text class="earn-val">¥{{ earnings.availableAmount.toLocaleString() }}</text>
          <text class="earn-label">可提现</text>
        </view>
        <view class="earn-divider"></view>
        <view class="earn-item">
          <text class="earn-val">¥{{ earnings.withdrawnAmount.toLocaleString() }}</text>
          <text class="earn-label">已申请</text>
        </view>
      </view>
    </view>

    <view class="menu-group" v-for="group in menuGroups" :key="group.title">
      <text class="menu-group-title">{{ group.title }}</text>
      <view class="menu-list">
        <view v-for="item in group.items" :key="item.key" class="menu-item" @click="handleMenu(item)">
          <text class="mi-icon">{{ item.icon }}</text>
          <text class="mi-label">{{ item.label }}</text>
          <text class="mi-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="logout-btn" v-if="userLoggedIn" @click="handleLogout">退出当前账号</view>
    <view class="bottom-space"></view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { earningApi } from '@/api/index'

const userStore = useUserStore()
const wxLoading = ref(false)
const showAccountLogin = ref(false)
const loginForm = reactive({ username: '', password: '' })
const earnings = reactive({ pendingAmount: 0, withdrawnAmount: 0, availableAmount: 0 })

const userLoggedIn = computed(() => userStore.isLoggedIn)
const displayUser = computed(() => userStore.user || { realName: '未登录', role: 'merchant', phone: '' })
const avatarText = computed(() => displayUser.value.realName?.slice(0, 1) || '饮')

const roleMap: Record<string, string> = {
  boss: '老板',
  admin: '管理员',
  salesperson: '业务员',
  maker: '制作员',
  delivery: '配送员',
  promoter: '推广员',
  merchant: '商户',
}

const roleLabel = computed(() => roleMap[displayUser.value.role] || displayUser.value.role)
const roleColor = computed(() => {
  const colors: Record<string, string> = {
    boss: '#d93025',
    admin: '#b06000',
    salesperson: '#1a73e8',
    maker: '#5f6368',
    delivery: '#188038',
    promoter: '#8e24aa',
    merchant: '#f57c00',
  }
  return colors[displayUser.value.role] || '#5f6368'
})
const showEarnings = computed(() => ['salesperson', 'maker', 'delivery', 'promoter'].includes(displayUser.value.role))

const menuGroups = computed(() => {
  const role = displayUser.value.role
  const groups: { title: string; items: { key: string; icon: string; label: string }[] }[] = []

  if (role === 'merchant') {
    groups.push({
      title: '账户服务',
      items: [
        { key: 'orders', icon: '📋', label: '我的订单' },
        { key: 'address', icon: '📍', label: '收货地址' },
        { key: 'bind-promo', icon: '🔗', label: '绑定推广码' },
      ],
    })
  }

  if (role === 'salesperson') {
    groups.push({
      title: '业务工作台',
      items: [
        { key: 'orders', icon: '📋', label: '我的订单' },
        { key: 'employee', icon: '📝', label: '接单与录单' },
        { key: 'promotion', icon: '📢', label: '推广工具' },
        { key: 'earnings', icon: '💵', label: '收益明细' },
        { key: 'withdrawal', icon: '🏦', label: '申请提现' },
      ],
    })
  }

  if (role === 'maker' || role === 'delivery') {
    groups.push({
      title: '员工工作台',
      items: [
        { key: 'orders', icon: '📋', label: '我的订单' },
        { key: 'employee', icon: '🧾', label: '我的任务单' },
        { key: 'earnings', icon: '💵', label: '收益明细' },
        { key: 'withdrawal', icon: '🏦', label: '申请提现' },
      ],
    })
  }

  if (role === 'promoter') {
    groups.push({
      title: '推广中心',
      items: [
        { key: 'promotion', icon: '🎫', label: '推广码与分润' },
        { key: 'earnings', icon: '💵', label: '收益明细' },
        { key: 'withdrawal', icon: '🏦', label: '申请提现' },
      ],
    })
  }

  groups.push({
    title: '通用',
    items: [
      { key: 'notifications', icon: '🔔', label: '消息通知' },
      { key: 'merchant-apply', icon: '🏪', label: '商家入驻' },
    ],
  })

  return groups
})

async function handleWxLogin() {
  wxLoading.value = true
  try {
    await userStore.wxLogin()
    await fetchEarnings()
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
  } finally {
    wxLoading.value = false
  }
}

async function handleAccountLogin() {
  try {
    await userStore.login(loginForm.username, loginForm.password)
    showAccountLogin.value = false
    await fetchEarnings()
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch {}
}

async function fetchEarnings() {
  if (!userStore.isLoggedIn || !showEarnings.value) return
  try {
    const data = await earningApi.myEarnings({ pageSize: 1 })
    earnings.pendingAmount = Number(data.pendingAmount || 0)
    earnings.withdrawnAmount = Number(data.withdrawnAmount || 0)
    earnings.availableAmount = Number(data.availableAmount || 0)
  } catch {
    earnings.pendingAmount = 0
    earnings.withdrawnAmount = 0
    earnings.availableAmount = 0
  }
}

function handleMenu(item: { key: string }) {
  const routeMap: Record<string, string> = {
    orders: '/pages/orders/orders',
    employee: '/pages/employee/employee',
    earnings: '/pages/employee/earnings',
    withdrawal: '/pages/employee/withdrawal',
    promotion: '/pages/promotion/promotion',
    'bind-promo': '/pages/promotion/promotion',
    notifications: '/pages/notifications/notifications',
    address: '/pages/address/address',
    'merchant-apply': '/pages/merchant-apply/merchant-apply',
  }
  const url = routeMap[item.key]
  if (url) uni.navigateTo({ url })
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录？',
    success: (res: any) => {
      if (res.confirm) userStore.logout()
    },
  })
}

onShow(() => {
  userStore.checkLogin()
  fetchEarnings()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.login-panel { text-align: center; padding: 54px 30px 34px; background: linear-gradient(180deg, #1a73e8, #f5f6f8 82%); }
.login-title { font-size: 22px; font-weight: 700; color: #fff; display: block; margin-bottom: 8px; }
.login-desc { font-size: 14px; color: rgba(255,255,255,0.78); display: block; margin-bottom: 28px; }
.wx-login-btn { background: #07c160; color: #fff; border: none; border-radius: 24px; padding: 14px 48px; font-size: 16px; font-weight: 600; width: 280px; margin: 0 auto; }
.account-toggle { font-size: 13px; color: #1a73e8; margin-top: 16px; display: block; }
.account-form { margin-top: 16px; background: #fff; border-radius: 12px; padding: 18px; }
.form-input { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 14px; }
.account-login-btn { background: #1a73e8; color: #fff; border: none; border-radius: 20px; padding: 11px; font-size: 15px; }
.user-card { background: linear-gradient(135deg, #1a73e8, #1557b0); padding: 24px 20px 20px; color: #fff; }
.uc-top { display: flex; align-items: center; }
.avatar { width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; margin-right: 14px; }
.uc-info { flex: 1; }
.uc-name { font-size: 19px; font-weight: 700; }
.uc-tags { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.uc-role { font-size: 11px; padding: 3px 10px; border-radius: 10px; color: #fff; font-weight: 600; }
.uc-phone { font-size: 11px; opacity: 0.75; }
.uc-earnings { display: flex; align-items: center; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.15); }
.earn-item { flex: 1; text-align: center; }
.earn-val { font-size: 17px; font-weight: 700; display: block; }
.earn-label { font-size: 11px; opacity: 0.72; }
.earn-divider { width: 1px; height: 30px; background: rgba(255,255,255,0.15); }
.menu-group { margin: 12px 12px 0; }
.menu-group-title { font-size: 13px; color: #999; padding: 0 4px 8px; display: block; }
.menu-list { background: #fff; border-radius: 12px; overflow: hidden; }
.menu-item { display: flex; align-items: center; padding: 15px 16px; border-bottom: 1px solid #f5f5f5; }
.menu-item:last-child { border-bottom: none; }
.mi-icon { font-size: 18px; margin-right: 12px; width: 24px; text-align: center; }
.mi-label { flex: 1; font-size: 15px; color: #333; }
.mi-arrow { font-size: 18px; color: #ccc; }
.logout-btn { margin: 24px 12px; text-align: center; padding: 14px; background: #fff; border-radius: 12px; color: #d93025; font-size: 15px; font-weight: 500; }
.bottom-space { height: 40px; }
</style>

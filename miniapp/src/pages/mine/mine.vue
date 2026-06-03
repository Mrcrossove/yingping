<template>
  <view class="page">
    <view class="login-panel" v-if="!userLoggedIn">
      <text class="login-title">饮品下单系统</text>
      <text class="login-desc">登录后可以下单、管理收货地址和查看订单</text>
      <button class="wx-login-btn" @click="handleWxLogin" :loading="wxLoading">微信用户一键登录</button>
    </view>

    <view class="user-card" v-else>
      <view class="uc-top">
        <view class="avatar">{{ avatarText }}</view>
        <view class="uc-info">
          <text class="uc-name">{{ displayName }}</text>
          <view class="uc-tags">
            <text class="uc-role">客户</text>
            <text class="uc-phone" v-if="displayUser.phone">{{ displayUser.phone }}</text>
          </view>
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

    <view v-if="phoneDialogVisible" class="modal-mask" @click="phoneDialogVisible = false">
      <view class="phone-box" @click.stop>
        <text class="phone-title">绑定手机号</text>
        <input v-model="phoneForm.phone" type="number" placeholder="请输入手机号" class="phone-input" />
        <view class="phone-actions">
          <button class="phone-cancel" @click="phoneDialogVisible = false">取消</button>
          <button class="phone-save" @click="handleBindPhone">保存</button>
        </view>
      </view>
    </view>

    <view class="logout-btn" v-if="userLoggedIn" @click="handleLogout">退出当前账号</view>
    <view class="bottom-space"></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api/index'

const userStore = useUserStore()
const wxLoading = ref(false)
const phoneDialogVisible = ref(false)
const phoneForm = ref({ phone: '' })

const userLoggedIn = computed(() => userStore.isLoggedIn)
const displayUser = computed(() => userStore.user || { realName: '未登录', role: 'merchant', phone: '' })
const displayName = computed(() => displayUser.value.realName || '微信用户')
const avatarText = computed(() => displayName.value.slice(0, 1) || '饮')

const menuGroups = computed(() => {
  if (!userLoggedIn.value) return []
  return [
    {
      title: '账户服务',
      items: [
        { key: 'orders', icon: '📋', label: '我的订单' },
        { key: 'phone', icon: '📱', label: '手机号' },
        { key: 'address', icon: '📍', label: '收货地址' },
        { key: 'notifications', icon: '🔔', label: '消息通知' },
      ],
    },
  ]
})

async function handleWxLogin() {
  wxLoading.value = true
  try {
    await userStore.wxLogin()
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
  } finally {
    wxLoading.value = false
  }
}

function handleMenu(item: { key: string }) {
  if (item.key === 'phone') {
    phoneForm.value.phone = displayUser.value.phone || ''
    phoneDialogVisible.value = true
    return
  }
  const routeMap: Record<string, string> = {
    orders: '/pages/orders/orders',
    notifications: '/pages/notifications/notifications',
    address: '/pages/address/address',
  }
  const url = routeMap[item.key]
  if (url) uni.navigateTo({ url })
}

async function handleBindPhone() {
  if (!/^1\d{10}$/.test(phoneForm.value.phone)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  const data = await authApi.bindPhone(phoneForm.value.phone)
  userStore.updateUser(data)
  phoneDialogVisible.value = false
  uni.showToast({ title: '手机号已保存', icon: 'success' })
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
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.login-panel { text-align: center; padding: 54px 30px 34px; background: linear-gradient(180deg, #1a73e8, #f5f6f8 82%); }
.login-title { font-size: 22px; font-weight: 700; color: #fff; display: block; margin-bottom: 8px; }
.login-desc { font-size: 14px; color: rgba(255,255,255,0.78); display: block; margin-bottom: 28px; }
.wx-login-btn { background: #07c160; color: #fff; border: none; border-radius: 24px; padding: 14px 48px; font-size: 16px; font-weight: 600; width: 280px; margin: 0 auto; }
.user-card { background: linear-gradient(135deg, #1a73e8, #1557b0); padding: 24px 20px 20px; color: #fff; }
.uc-top { display: flex; align-items: center; }
.avatar { width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; margin-right: 14px; }
.uc-info { flex: 1; }
.uc-name { font-size: 19px; font-weight: 700; }
.uc-tags { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.uc-role { font-size: 11px; padding: 3px 10px; border-radius: 10px; color: #fff; font-weight: 600; background: #f57c00; }
.uc-phone { font-size: 11px; opacity: 0.75; }
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
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.phone-box { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; box-sizing: border-box; }
.phone-title { font-size: 17px; font-weight: 700; text-align: center; display: block; margin-bottom: 16px; }
.phone-input { border: 1px solid #eee; border-radius: 8px; padding: 12px; font-size: 14px; margin-bottom: 16px; }
.phone-actions { display: flex; gap: 12px; }
.phone-cancel { flex: 1; background: #f5f5f5; color: #666; border: none; border-radius: 8px; padding: 12px; }
.phone-save { flex: 1; background: #1a73e8; color: #fff; border: none; border-radius: 8px; padding: 12px; }
</style>

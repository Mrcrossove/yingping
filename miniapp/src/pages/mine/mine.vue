<template>
  <view class="container">
    <view class="user-section">
      <view class="avatar">👤</view>
      <view v-if="userStore.isLoggedIn" class="user-info">
        <text class="user-name">{{ userStore.user?.realName }}</text>
        <text class="user-role">{{ roleLabel }}</text>
      </view>
      <view v-else class="login-btn" @click="showLogin = true">
        <text>点击登录</text>
      </view>
    </view>

    <view class="menu-list">
      <view class="menu-item" @click="goPage('/pages/cart/cart')">
        <text>购物车</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="switchToEmployee" v-if="userStore.isLoggedIn && userStore.isEmployee">
        <text>员工工作台</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="goPage('/pages/promotion/promotion')" v-if="userStore.isLoggedIn">
        <text>推广中心</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" v-if="userStore.isLoggedIn" @click="bindPromoCode">
        <text>绑定推广码</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="userStore.logout()" v-if="userStore.isLoggedIn" style="margin-top: 20px;">
        <text style="color: #f56c6c;">退出登录</text>
      </view>
    </view>

    <!-- 登录弹窗 -->
    <view v-if="showLogin" class="modal-mask" @click="showLogin = false">
      <view class="modal-content" @click.stop>
        <view class="tabs">
          <text :class="['tab', { active: loginTab === 'login' }]" @click="loginTab = 'login'">登录</text>
          <text :class="['tab', { active: loginTab === 'register' }]" @click="loginTab = 'register'">注册</text>
        </view>
        <template v-if="loginTab === 'login'">
          <input v-model="loginForm.username" placeholder="账号" class="form-input" />
          <input v-model="loginForm.password" type="password" placeholder="密码" class="form-input" />
          <button class="form-btn" @click="handleLogin">登录</button>
        </template>
        <template v-else>
          <input v-model="regForm.username" placeholder="账号" class="form-input" />
          <input v-model="regForm.password" type="password" placeholder="密码" class="form-input" />
          <input v-model="regForm.realName" placeholder="姓名" class="form-input" />
          <input v-model="regForm.phone" placeholder="手机号" class="form-input" />
          <button class="form-btn" @click="handleRegister">注册</button>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { promotionApi } from '@/api/index'

const userStore = useUserStore()
const showLogin = ref(false)
const loginTab = ref('login')
const loginForm = ref({ username: '', password: '' })
const regForm = ref({ username: '', password: '', realName: '', phone: '', role: 'merchant' })

const roleMap: Record<string, string> = {
  boss: '老板', admin: '管理员', salesperson: '业务员',
  maker: '制作员', delivery: '配送员', promoter: '推广员', merchant: '商户',
}
const roleLabel = computed(() => roleMap[userStore.user?.role || ''] || '')

function goPage(url: string) { uni.navigateTo({ url }) }

function switchToEmployee() {
  uni.navigateTo({ url: '/pages/employee/employee' })
}

async function handleLogin() {
  try {
    await userStore.login(loginForm.value.username, loginForm.value.password)
    showLogin.value = false
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch { }
}

async function handleRegister() {
  try {
    await userStore.register(regForm.value)
    showLogin.value = false
    uni.showToast({ title: '注册成功', icon: 'success' })
  } catch { }
}

function bindPromoCode() {
  uni.showModal({
    title: '绑定推广码',
    editable: true,
    placeholderText: '请输入推广码',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          await promotionApi.bindMerchant(res.content)
          uni.showToast({ title: '绑定成功', icon: 'success' })
        } catch { }
      }
    },
  })
}
</script>

<style scoped>
.container { }
.user-section { display: flex; align-items: center; padding: 30px 20px; background: #409EFF; }
.avatar { font-size: 50px; margin-right: 16px; }
.user-info { color: #fff; }
.user-name { font-size: 18px; font-weight: bold; }
.user-role { font-size: 13px; opacity: 0.8; margin-left: 8px; }
.login-btn { color: #fff; font-size: 18px; }
.menu-list { margin: 10px; background: #fff; border-radius: 10px; overflow: hidden; }
.menu-item { display: flex; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; font-size: 15px; }
.arrow { color: #ccc; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-content { width: 320px; background: #fff; border-radius: 12px; padding: 24px; }
.tabs { display: flex; margin-bottom: 16px; }
.tab { flex: 1; text-align: center; padding: 8px; font-size: 16px; color: #999; }
.tab.active { color: #409EFF; font-weight: bold; border-bottom: 2px solid #409EFF; }
.form-input { border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 14px; }
.form-btn { background: #409EFF; color: #fff; border: none; border-radius: 8px; padding: 10px; font-size: 16px; }
</style>

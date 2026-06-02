import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, post } from '@/utils/request'

interface User {
  id: number
  username: string
  realName: string
  role: string
  phone?: string
  avatar?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isEmployee = computed(() => ['salesperson', 'maker', 'delivery', 'promoter'].includes(user.value?.role || ''))

  function checkLogin() {
    token.value = uni.getStorageSync('token') || ''
    const u = uni.getStorageSync('user')
    user.value = u ? JSON.parse(u) : null
  }

  function capturePromoterCode(options?: any) {
    const rawScene = options?.query?.scene
    const code = rawScene ? decodeURIComponent(rawScene) : options?.query?.promoterCode
    if (code) uni.setStorageSync('promoterCode', String(code).trim())
  }

  function saveLogin(data: any) {
    token.value = data.token
    user.value = data.user
    uni.setStorageSync('token', data.token)
    uni.setStorageSync('user', JSON.stringify(data.user))
  }

  async function login(username: string, password: string) {
    const data = await post('/auth/login', { username, password })
    saveLogin(data)
    return data
  }

  async function wxLogin() {
    return new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: async (loginRes: any) => {
          try {
            const data = await post('/auth/wx-login', {
              code: loginRes.code,
              promoterCode: uni.getStorageSync('promoterCode') || undefined,
            })
            saveLogin(data)
            resolve(data)
          } catch (err) { reject(err) }
        },
        fail: (err: any) => { reject(err) },
      })
    })
  }

  async function register(form: any) {
    const data = await post('/auth/register', {
      ...form,
      promoterCode: uni.getStorageSync('promoterCode') || undefined,
    })
    saveLogin(data)
    return data
  }

  function logout() {
    token.value = ''
    user.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('user')
    uni.reLaunch({ url: '/pages/index/index' })
  }

  return { token, user, isLoggedIn, isEmployee, capturePromoterCode, checkLogin, login, wxLogin, register, logout }
})

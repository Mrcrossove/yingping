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

  async function login(username: string, password: string) {
    const data = await post('/auth/login', { username, password })
    token.value = data.token
    user.value = data.user
    uni.setStorageSync('token', data.token)
    uni.setStorageSync('user', JSON.stringify(data.user))
    return data
  }

  async function register(form: any) {
    const data = await post('/auth/register', form)
    token.value = data.token
    user.value = data.user
    uni.setStorageSync('token', data.token)
    uni.setStorageSync('user', JSON.stringify(data.user))
    return data
  }

  function logout() {
    token.value = ''
    user.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('user')
    uni.reLaunch({ url: '/pages/index/index' })
  }

  return { token, user, isLoggedIn, isEmployee, checkLogin, login, register, logout }
})

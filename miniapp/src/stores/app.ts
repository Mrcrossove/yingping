import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Role = 'boss' | 'admin' | 'salesperson' | 'maker' | 'delivery' | 'promoter' | 'merchant'

export const useAppStore = defineStore('app', () => {
  const currentRole = ref<Role>((uni.getStorageSync('mockRole') as Role) || 'merchant')

  const roleLabel = computed(() => {
    const map: Record<Role, string> = {
      boss: '老板', admin: '管理员', salesperson: '业务员',
      maker: '制作员', delivery: '配送员', promoter: '推广员', merchant: '商户',
    }
    return map[currentRole.value] || currentRole.value
  })

  const isLoggedIn = computed(() => true)

  function switchRole(role: Role) {
    currentRole.value = role
    uni.setStorageSync('mockRole', role)
  }

  return { currentRole, roleLabel, isLoggedIn, switchRole }
})

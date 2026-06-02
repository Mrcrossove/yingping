<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside">
      <div class="logo">
        <span v-if="!collapsed">🍹 饮品管理系统</span>
        <span v-else>🍹</span>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="collapsed"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button @click="collapsed = !collapsed" text>
            <el-icon :size="20"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          </el-button>
        </div>
        <div class="header-right">
          <span class="user-info">{{ userStore.user?.realName }} ({{ roleLabel }})</span>
          <el-button type="danger" text @click="userStore.logout()">退出</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { canAccessRoute } from '@/utils/access'

const route = useRoute()
const userStore = useUserStore()
const collapsed = ref(false)

const roleMap: Record<string, string> = {
  boss: '老板', admin: '管理员', salesperson: '业务员',
  maker: '制作员', delivery: '配送员', promoter: '推广员', merchant: '商户',
}
const roleLabel = computed(() => roleMap[userStore.role] || userStore.role)

const menuItems = computed(() => {
  const all = route.matched[0]?.children?.filter((r) => !r.meta?.hidden) || []
  return all
    .filter((r) => canAccessRoute(r.name, userStore.role))
    .map((r) => ({ path: `/${r.path}`, title: r.meta?.title as string, icon: r.meta?.icon as string }))
})
</script>

<style scoped>
.layout { height: 100vh; }
.aside { background: #304156; transition: width 0.3s; overflow: hidden; }
.logo { height: 60px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; font-weight: bold; white-space: nowrap; }
.header { background: #fff; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e6e6e6; padding: 0 20px; }
.header-right { display: flex; align-items: center; gap: 12px; }
.user-info { color: #606266; }
.main { background: #f0f2f5; padding: 20px; }
.el-menu { border-right: none; }
</style>

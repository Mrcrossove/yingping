<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside desktop-aside">
      <div class="logo">
        <span v-if="!collapsed">🍹 饮品管理系统</span>
        <span v-else>🍹</span>
      </div>
      <el-menu
        class="app-menu"
        :default-active="route.path"
        :collapse="collapsed"
        router
        background-color="#172033"
        text-color="#aeb8c7"
        active-text-color="#ffffff"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container class="content-shell">
      <el-header class="header">
        <div class="header-left">
          <el-button class="desktop-toggle" @click="collapsed = !collapsed" text>
            <el-icon :size="20"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          </el-button>
          <el-button class="mobile-toggle" @click="drawerVisible = true" text>
            <el-icon :size="20"><Menu /></el-icon>
          </el-button>
          <span class="mobile-title">饮品管理系统</span>
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
    <el-drawer
      v-model="drawerVisible"
      title="饮品管理系统"
      direction="ltr"
      size="260px"
      class="mobile-menu-drawer"
    >
      <el-menu
        class="app-menu mobile-app-menu"
        :default-active="route.path"
        router
        background-color="#172033"
        text-color="#aeb8c7"
        active-text-color="#ffffff"
        @select="drawerVisible = false"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-drawer>
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
const drawerVisible = ref(false)

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
.layout { height: 100vh; overflow: hidden; background: #eef2f6; }
.content-shell { min-width: 0; height: 100vh; }
.aside { background: #172033; transition: width 0.3s; overflow: hidden; height: 100vh; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.06); }
.logo { height: 60px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 17px; font-weight: 800; white-space: nowrap; letter-spacing: 0.2px; background: #111827; }
.header { background: rgba(255,255,255,0.92); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e6ebf2; padding: 0 20px; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.header-right { display: flex; align-items: center; gap: 12px; }
.user-info { color: #606266; }
.main { height: calc(100vh - 60px); overflow: auto; background: #eef2f6; padding: 22px; }
.app-menu { border-right: none; flex: 1; overflow-y: auto; overflow-x: hidden; }
.app-menu::-webkit-scrollbar { width: 6px; }
.app-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); border-radius: 6px; }
.mobile-toggle, .mobile-title { display: none; }

:deep(.el-menu-item) { height: 44px; margin: 4px 10px; border-radius: 8px; color: #aeb8c7; }
:deep(.el-menu-item.is-active) { background: #2563eb !important; color: #fff !important; box-shadow: 0 8px 18px rgba(37,99,235,0.28); }
:deep(.el-menu-item:hover) { background: rgba(255,255,255,0.08) !important; color: #fff !important; }

:deep(.mobile-menu-drawer .el-drawer__body) { padding: 0; background: #172033; overflow: hidden; }
:deep(.mobile-menu-drawer .el-drawer__header) { margin-bottom: 0; padding: 16px 18px; background: #111827; color: #fff; }
:deep(.mobile-menu-drawer .el-drawer__close-btn) { color: #fff; }
.mobile-app-menu { height: 100%; overflow-y: auto; }

@media (max-width: 768px) {
  .desktop-aside, .desktop-toggle { display: none; }
  .mobile-toggle, .mobile-title { display: inline-flex; }
  .mobile-title { font-size: 16px; font-weight: 700; color: #303133; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .header { height: 52px; padding: 0 10px; }
  .header-right { gap: 6px; flex-shrink: 0; }
  .user-info { max-width: 120px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 13px; }
  .main { height: calc(100vh - 52px); padding: 10px; }
}
</style>

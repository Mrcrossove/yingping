<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside desktop-aside">
      <div class="logo">
        <div class="brand-mark">栀</div>
        <div v-if="!collapsed" class="brand-copy">
          <strong>栀致饮品</strong>
          <span>运营管理后台</span>
        </div>
      </div>
      <el-menu
        class="app-menu"
        :default-active="route.path"
        :collapse="collapsed"
        router
        background-color="transparent"
        text-color="#b7c9bd"
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
          <div class="page-title">
            <span>{{ currentTitle }}</span>
            <small>栀致饮品</small>
          </div>
        </div>
        <div class="header-right">
          <span class="user-info">{{ userStore.user?.realName }} <em>{{ roleLabel }}</em></span>
          <el-button class="logout-button" text @click="userStore.logout()">退出</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      size="260px"
      class="mobile-menu-drawer"
    >
      <template #header>
        <div class="drawer-brand">
          <div class="brand-mark">栀</div>
          <div>
            <strong>栀致饮品</strong>
            <span>运营管理后台</span>
          </div>
        </div>
      </template>
      <el-menu
        class="app-menu mobile-app-menu"
        :default-active="route.path"
        router
        background-color="transparent"
        text-color="#b7c9bd"
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

const currentTitle = computed(() => route.meta?.title || '运营管理')

const menuItems = computed(() => {
  const all = route.matched[0]?.children?.filter((r) => !r.meta?.hidden) || []
  return all
    .filter((r) => canAccessRoute(r.name, userStore.role))
    .map((r) => ({ path: `/${r.path}`, title: r.meta?.title as string, icon: r.meta?.icon as string }))
})

</script>

<style scoped>
.layout { height: 100vh; overflow: hidden; background: #f4f7f2; }
.content-shell { min-width: 0; height: 100vh; }
.aside {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,0.08);
  background:
    radial-gradient(circle at 20% 8%, rgba(216, 154, 66, 0.2), transparent 28%),
    linear-gradient(180deg, #0f241a 0%, #173b29 48%, #10251d 100%);
  transition: width 0.3s;
}
.aside::after {
  position: absolute;
  inset: auto 14px 16px;
  height: 1px;
  content: "";
  background: linear-gradient(90deg, transparent, rgba(216, 154, 66, 0.5), transparent);
}
.logo {
  height: 78px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  color: #fff;
  white-space: nowrap;
  background: rgba(7, 18, 13, 0.38);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 12px;
  color: #fff;
  font-size: 20px;
  font-weight: 900;
  background: linear-gradient(145deg, #2f8a5a, #d89a42);
  box-shadow: 0 12px 28px rgba(6, 23, 14, 0.32);
}
.brand-copy strong,
.drawer-brand strong {
  display: block;
  font-size: 18px;
  line-height: 1.1;
  letter-spacing: 0;
}
.brand-copy span,
.drawer-brand span {
  display: block;
  margin-top: 5px;
  color: #a9bdb0;
  font-size: 12px;
}
.header {
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  border-bottom: 1px solid #e2e8de;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
}
.header-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.header-right { display: flex; align-items: center; gap: 12px; }
.page-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.page-title span {
  color: #20362a;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.2;
}
.page-title small {
  margin-top: 2px;
  color: #7b8a80;
  font-size: 12px;
}
.user-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #435349;
  font-weight: 600;
}
.user-info em {
  padding: 3px 8px;
  border-radius: 999px;
  color: #2d6e49;
  font-size: 12px;
  font-style: normal;
  background: #e7f2e9;
}
.logout-button {
  color: #8b4b2e;
}
.logout-button:hover {
  color: #b85c34;
  background: #fff0e8;
}
.main {
  height: calc(100vh - 60px);
  overflow: auto;
  padding: 22px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.45), transparent 220px),
    #f4f7f2;
}
.app-menu { position: relative; z-index: 1; border-right: none; flex: 1; padding: 10px 0 20px; overflow-y: auto; overflow-x: hidden; }
.app-menu::-webkit-scrollbar { width: 6px; }
.app-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.24); border-radius: 6px; }
.mobile-toggle { display: none; }

:deep(.el-menu--collapse) { width: 64px; }
:deep(.el-menu-item) {
  height: 44px;
  margin: 5px 10px;
  border-radius: 8px;
  color: #b7c9bd;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}
:deep(.el-menu-item .el-icon) {
  color: #8fb39d;
  font-size: 18px;
}
:deep(.el-menu-item.is-active) {
  color: #fff !important;
  background: linear-gradient(135deg, rgba(48, 138, 90, 0.95), rgba(216, 154, 66, 0.9)) !important;
  box-shadow: 0 10px 24px rgba(3, 22, 12, 0.28);
}
:deep(.el-menu-item.is-active .el-icon) {
  color: #fff;
}
:deep(.el-menu-item:hover) {
  color: #fff !important;
  background: rgba(255,255,255,0.1) !important;
  transform: translateX(2px);
}
:deep(.el-card) {
  border-color: #e2e8de;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(44, 72, 50, 0.06);
}
:deep(.el-table th.el-table__cell) {
  background: #f3f7ef;
  color: #314236;
}
:deep(.el-button--primary) {
  --el-button-bg-color: #2f7d52;
  --el-button-border-color: #2f7d52;
  --el-button-hover-bg-color: #256c46;
  --el-button-hover-border-color: #256c46;
}

:deep(.mobile-menu-drawer .el-drawer__body) { padding: 0; background: linear-gradient(180deg, #0f241a, #173b29); overflow: hidden; }
:deep(.mobile-menu-drawer .el-drawer__header) { margin-bottom: 0; padding: 16px 18px; background: #0b1b13; color: #fff; }
:deep(.mobile-menu-drawer .el-drawer__close-btn) { color: #fff; }
.drawer-brand { display: flex; align-items: center; gap: 12px; color: #fff; }
.mobile-app-menu { height: 100%; overflow-y: auto; }

@media (max-width: 768px) {
  .desktop-aside, .desktop-toggle { display: none; }
  .mobile-toggle { display: inline-flex; }
  .header { height: 52px; padding: 0 10px; }
  .header-right { gap: 6px; flex-shrink: 0; }
  .page-title span { font-size: 15px; }
  .page-title small { display: none; }
  .user-info { max-width: 120px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 13px; }
  .main { height: calc(100vh - 52px); padding: 10px; }
}
</style>

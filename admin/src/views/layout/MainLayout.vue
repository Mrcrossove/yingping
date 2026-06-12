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
          <el-popover
            v-model:visible="notificationOpen"
            placement="bottom-end"
            width="340"
            trigger="click"
            @show="fetchNotifications(false)"
          >
            <template #reference>
              <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="notification-badge">
                <el-button class="notification-button" circle text>
                  <el-icon :size="20"><Bell /></el-icon>
                </el-button>
              </el-badge>
            </template>
            <div class="notification-panel">
              <div class="notification-head">
                <strong>接单提醒</strong>
                <el-button v-if="unreadCount > 0" link type="primary" @click="handleMarkAllRead">全部已读</el-button>
              </div>
              <div v-if="notifications.length === 0" class="notification-empty">暂无提醒</div>
              <div v-else class="notification-list">
                <button
                  v-for="item in notifications"
                  :key="item.id"
                  class="notification-item"
                  :class="{ unread: !item.read }"
                  @click="handleNotificationClick(item)"
                >
                  <span class="notification-title">{{ item.title }}</span>
                  <span class="notification-content">{{ item.content || '-' }}</span>
                  <span class="notification-time">{{ formatNotificationTime(item.createdAt) }}</span>
                </button>
              </div>
            </div>
          </el-popover>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { canAccessRoute } from '@/utils/access'
import { notificationApi } from '@/api/index'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const collapsed = ref(false)
const drawerVisible = ref(false)
const notificationOpen = ref(false)
const notifications = ref<any[]>([])
const unreadCount = ref(0)
const lastKnownUnreadIds = ref<Set<number>>(new Set())
let notificationTimer: number | undefined

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

async function fetchNotifications(shouldToast = true) {
  try {
    const data = await notificationApi.list({ page: 1, pageSize: 8 })
    const list = data.list || []
    const unreadIds = new Set<number>(list.filter((item: any) => !item.read).map((item: any) => item.id))
    const newItems = list.filter((item: any) => !item.read && !lastKnownUnreadIds.value.has(item.id))
    notifications.value = list
    unreadCount.value = data.unreadCount || 0
    if (shouldToast && lastKnownUnreadIds.value.size > 0 && newItems.length > 0) {
      const first = newItems[0]
      ElMessage({
        type: 'success',
        message: `${first.title}${first.content ? `：${first.content}` : ''}`,
        duration: 5000,
      })
    }
    lastKnownUnreadIds.value = unreadIds
  } catch {
    // The global request interceptor handles auth and visible errors.
  }
}

async function handleNotificationClick(item: any) {
  if (!item.read) {
    await notificationApi.markRead(item.id)
    item.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    lastKnownUnreadIds.value.delete(item.id)
  }
  notificationOpen.value = false
  if (item.targetPath) router.push(item.targetPath)
}

async function handleMarkAllRead() {
  await notificationApi.markAllRead()
  notifications.value = notifications.value.map((item) => ({ ...item, read: true }))
  unreadCount.value = 0
  lastKnownUnreadIds.value = new Set()
}

function formatNotificationTime(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

onMounted(() => {
  fetchNotifications(false)
  notificationTimer = window.setInterval(() => fetchNotifications(true), 10000)
})

onBeforeUnmount(() => {
  if (notificationTimer) window.clearInterval(notificationTimer)
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
.notification-badge { display: inline-flex; }
.notification-button {
  color: #2d6e49;
  background: #eef6ef;
}
.notification-button:hover {
  color: #1f5f3c;
  background: #e0f0e4;
}
.notification-panel { max-height: 420px; overflow: hidden; }
.notification-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid #edf1ec;
}
.notification-head strong { color: #20362a; font-size: 15px; }
.notification-empty {
  padding: 28px 0;
  text-align: center;
  color: #8b95a5;
}
.notification-list {
  max-height: 340px;
  overflow-y: auto;
  padding-top: 6px;
}
.notification-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 8px;
  border: 0;
  border-bottom: 1px solid #edf1ec;
  text-align: left;
  background: #fff;
  cursor: pointer;
}
.notification-item:hover { background: #f5faf4; }
.notification-item.unread { background: #f0f7ef; }
.notification-title {
  color: #20362a;
  font-weight: 800;
  font-size: 14px;
}
.notification-content {
  color: #526357;
  font-size: 13px;
  line-height: 1.4;
}
.notification-time {
  color: #9aa5a0;
  font-size: 12px;
}
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
  .notification-button { width: 32px; height: 32px; }
  .page-title span { font-size: 15px; }
  .page-title small { display: none; }
  .user-info { max-width: 120px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 13px; }
  .main { height: calc(100vh - 52px); padding: 10px; }
}
</style>

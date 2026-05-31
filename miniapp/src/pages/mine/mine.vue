<template>
  <view class="page">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="uc-top">
        <view class="avatar">{{ user.realName[0] }}</view>
        <view class="uc-info">
          <text class="uc-name">{{ user.realName }}</text>
          <view class="uc-tags">
            <text class="uc-role" :style="{ background: roleColor }">{{ appStore.roleLabel }}</text>
            <text class="uc-dept" v-if="showDept">直属上级：王老板</text>
          </view>
        </view>
        <view class="uc-switch" @click="showRoleSwitcher = true">
          <text>切换</text>
        </view>
      </view>
      <!-- 收益概要（员工可见） -->
      <view class="uc-earnings" v-if="showEarnings">
        <view class="earn-item">
          <text class="earn-val">¥{{ user.earnings.pending.toLocaleString() }}</text>
          <text class="earn-label">待结算</text>
        </view>
        <view class="earn-divider"></view>
        <view class="earn-item">
          <text class="earn-val">¥{{ user.earnings.withdrawn.toLocaleString() }}</text>
          <text class="earn-label">已提现</text>
        </view>
        <view class="earn-divider"></view>
        <view class="earn-item" v-if="user.taskCount">
          <text class="earn-val">{{ user.taskCount }}</text>
          <text class="earn-label">今日任务</text>
        </view>
        <view class="earn-divider"></view>
        <view class="earn-item" v-if="user.customerCount">
          <text class="earn-val">{{ user.customerCount }}</text>
          <text class="earn-label">客户数</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 — 按角色动态展示 -->
    <view class="menu-group" v-for="(group, gi) in menuGroups" :key="gi">
      <text class="menu-group-title" v-if="group.title">{{ group.title }}</text>
      <view class="menu-list">
        <view v-for="item in group.items" :key="item.key" class="menu-item" @click="handleMenu(item)">
          <text class="mi-icon">{{ item.icon }}</text>
          <text class="mi-label">{{ item.label }}</text>
          <text class="mi-badge" v-if="item.badge">{{ item.badge }}</text>
          <text class="mi-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出 -->
    <view class="logout-btn" @click="handleLogout">退出当前账号</view>

    <view style="height: 40px;"></view>

    <!-- 角色切换面板 -->
    <view v-if="showRoleSwitcher" class="modal-mask" @click="showRoleSwitcher = false">
      <view class="role-sheet" @click.stop>
        <text class="sheet-title">切换角色预览</text>
        <view v-for="r in allRoles" :key="r.value" class="role-option"
          :class="{ selected: appStore.currentRole === r.value }"
          @click="appStore.switchRole(r.value); showRoleSwitcher = false">
          <text>{{ r.icon }} {{ r.label }}</text>
          <text class="role-desc">{{ r.desc }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { mockUser } from '@/mock/index'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const showRoleSwitcher = ref(false)

const user = reactive({ ...mockUser, taskCount: 12 })

const roleColor = computed(() => {
  const colors: Record<string, string> = {
    boss: '#F56C6C', admin: '#E6A23C', salesperson: '#1a73e8',
    maker: '#909399', delivery: '#67C23A', promoter: '#9C27B0', merchant: '#FF9800',
  }
  return colors[appStore.currentRole] || '#666'
})

const showDept = computed(() => ['salesperson', 'maker', 'delivery', 'promoter', 'admin'].includes(appStore.currentRole))
const showEarnings = computed(() => ['salesperson', 'maker', 'delivery', 'promoter'].includes(appStore.currentRole))

const allRoles = [
  { value: 'merchant' as const, label: '商户', icon: '🏪', desc: '浏览商品、下单、查看订单、绑定推广码' },
  { value: 'salesperson' as const, label: '业务员', icon: '💼', desc: '接单、派单、代客录单、客户管理' },
  { value: 'maker' as const, label: '制作员', icon: '🔧', desc: '接收制作任务、确认完成、收益提现' },
  { value: 'delivery' as const, label: '配送员', icon: '🛵', desc: '接收配送任务、确认送达、收益提现' },
  { value: 'promoter' as const, label: '推广员', icon: '📢', desc: '推广码、商户绑定、佣金提成' },
  { value: 'boss' as const, label: '老板', icon: '👑', desc: '员工管理、权限分配、数据导出' },
]

// 按角色动态菜单
const menuGroups = computed(() => {
  const role = appStore.currentRole
  const groups: { title?: string; items: { key: string; icon: string; label: string; badge?: string; action?: string }[] }[] = []

  // 老板/管理员
  if (role === 'boss' || role === 'admin') {
    groups.push({
      title: '管理功能',
      items: [
        { key: 'staff', icon: '👥', label: '员工管理', badge: '新建/编辑' },
        { key: 'permissions', icon: '🔐', label: '权限分配', badge: '' },
        { key: 'export', icon: '📊', label: '数据导出 (Excel)' },
        { key: 'finance', icon: '💰', label: '财务报表' },
      ],
    })
  }

  // 业务员
  if (role === 'salesperson') {
    groups.push({
      title: '工作台',
      items: [
        { key: 'agent-record', icon: '📝', label: '代客录单记录' },
        { key: 'my-customers', icon: '👤', label: '我的客户', badge: `${user.customerCount}家` },
        { key: 'performance', icon: '📈', label: '业绩统计' },
        { key: 'promotion', icon: '📢', label: '推广工具' },
        { key: 'employee', icon: '🔧', label: '员工工作台' },
      ],
    })
  }

  // 制作员/配送员
  if (role === 'maker' || role === 'delivery') {
    groups.push({
      title: '工作台',
      items: [
        { key: 'employee', icon: '📋', label: '我的任务单', badge: `${user.taskCount}单` },
        { key: 'earnings', icon: '💵', label: '收益明细' },
        { key: 'withdrawal', icon: '🏦', label: '申请提现' },
        { key: 'history', icon: '📜', label: '历史记录' },
      ],
    })
  }

  // 推广员
  if (role === 'promoter') {
    groups.push({
      title: '推广中心',
      items: [
        { key: 'promo-code', icon: '🎫', label: '我的推广码' },
        { key: 'bound-merchants', icon: '🏪', label: '绑定商户列表' },
        { key: 'commission', icon: '💎', label: '佣金收益' },
        { key: 'withdrawal', icon: '🏦', label: '提现记录' },
      ],
    })
  }

  // 商户
  if (role === 'merchant') {
    groups.push({
      title: '账户管理',
      items: [
        { key: 'notifications', icon: '🔔', label: '消息通知', badge: '3' },

      { key: 'address', icon: '📍', label: '收货地址管理' },
        { key: 'invoice', icon: '🧾', label: '开票信息' },
        { key: 'bind-promo', icon: '🔗', label: '绑定推广码' },
      ],
    })
  }

  // 通用功能
  groups.push({
    title: '通用',
    items: [
      { key: 'notifications', icon: '🔔', label: '消息通知', badge: '3' },
      { key: 'security', icon: '🛡️', label: '账号安全' },
      { key: 'about', icon: 'ℹ️', label: '关于我们' },
    ],
  })

  return groups
})

function handleMenu(item: any) {
  const routeMap: Record<string, string> = {
    employee: '/pages/employee/employee',
    earnings: '/pages/employee/earnings',
    withdrawal: '/pages/employee/withdrawal',
    'promo-code': '/pages/promotion/promotion',
    'bind-promo': '/pages/promotion/promotion',
    promotion: '/pages/promotion/promotion',
    notifications: '/pages/notifications/notifications',
    export: '#', staff: '#', permissions: '#', finance: '#',
    'agent-record': '#', 'my-customers': '#', performance: '#',
    history: '#', 'bound-merchants': '#', commission: '#',
      address: '#', invoice: '#', security: '#', about: '#',
  }
  const url = routeMap[item.key]
  if (url && url !== '#') uni.navigateTo({ url })
  else if (url === '#') uni.showToast({ title: '功能开发中', icon: 'none' })
}

function handleLogout() {
  uni.showModal({
    title: '提示', content: '确定退出登录？',
    success: (res: any) => { if (res.confirm) uni.reLaunch({ url: '/pages/index/index' }) },
  })
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f6f8; }
.user-card { background: linear-gradient(135deg, #1a73e8, #1557b0); padding: 24px 20px 20px; color: #fff; }
.uc-top { display: flex; align-items: center; }
.avatar { width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; margin-right: 14px; }
.uc-info { flex: 1; }
.uc-name { font-size: 19px; font-weight: 700; }
.uc-tags { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.uc-role { font-size: 11px; padding: 3px 10px; border-radius: 10px; color: #fff; font-weight: 600; }
.uc-dept { font-size: 11px; opacity: 0.75; }
.uc-switch { font-size: 12px; opacity: 0.8; padding: 6px 12px; background: rgba(255,255,255,0.15); border-radius: 16px; }
.uc-earnings { display: flex; align-items: center; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.15); }
.earn-item { flex: 1; text-align: center; }
.earn-val { font-size: 18px; font-weight: 700; display: block; }
.earn-label { font-size: 11px; opacity: 0.7; }
.earn-divider { width: 1px; height: 30px; background: rgba(255,255,255,0.15); }
.menu-group { margin: 12px 12px 0; }
.menu-group-title { font-size: 13px; color: #999; padding: 0 4px 8px; display: block; }
.menu-list { background: #fff; border-radius: 12px; overflow: hidden; }
.menu-item { display: flex; align-items: center; padding: 15px 16px; border-bottom: 1px solid #f5f5f5; }
.menu-item:last-child { border-bottom: none; }
.mi-icon { font-size: 18px; margin-right: 12px; width: 24px; text-align: center; }
.mi-label { flex: 1; font-size: 15px; color: #333; }
.mi-badge { font-size: 11px; color: #999; margin-right: 8px; }
.mi-arrow { font-size: 18px; color: #ccc; }
.logout-btn { margin: 24px 12px; text-align: center; padding: 14px; background: #fff; border-radius: 12px; color: #F56C6C; font-size: 15px; font-weight: 500; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.role-sheet { width: 100%; max-height: 70vh; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; overflow-y: auto; }
.sheet-title { font-size: 16px; font-weight: 700; display: block; margin-bottom: 12px; text-align: center; }
.role-option { padding: 14px; border-radius: 10px; margin-bottom: 6px; background: #f5f6f8; display: flex; justify-content: space-between; align-items: center; }
.role-option.selected { background: #e8f0fe; border: 1px solid #1a73e8; }
.role-desc { font-size: 11px; color: #999; }
</style>

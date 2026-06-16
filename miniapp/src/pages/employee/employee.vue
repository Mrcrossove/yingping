<template>
  <view class="container">
    <view class="role-header">
      <text class="role-title">{{ roleLabel }}工作台</text>
    </view>

    <template v-if="userStore.user?.role === 'delivery'">
      <view class="section">
        <text class="section-title">配送订单</text>
        <view v-for="o in orders" :key="o.id" class="order-card" @click="goDetail(o.id)">
          <view class="order-main">
            <text class="order-no">{{ o.orderNo }}</text>
            <text class="order-status">{{ statusMap[o.status] || o.status }}</text>
          </view>
          <view class="order-actions">
            <button v-if="o.status === 'made'" @click.stop="handleDeliveryStart(o.id)" class="mini-btn">去配送</button>
            <button v-if="o.status === 'delivering'" @click.stop="handleDeliveryComplete(o.id)" class="mini-btn primary">确认送达</button>
          </view>
        </view>
        <view v-if="orders.length === 0" class="empty">暂无配送任务</view>
      </view>
    </template>

    <template v-else>
      <view class="section">
        <text class="empty">当前角色暂无工作台任务</text>
      </view>
    </template>

    <view class="bottom-nav">
      <view class="nav-item" @click="uni.navigateTo({ url: '/pages/employee/earnings' })">
        <text class="nav-icon">￥</text>
        <text>收益</text>
      </view>
      <view class="nav-item" @click="uni.navigateTo({ url: '/pages/employee/withdrawal' })">
        <text class="nav-icon">¥</text>
        <text>提现</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { orderApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const orders = ref<any[]>([])

const roleMap: Record<string, string> = {
  delivery: '配送员',
  promoter: '推广员',
}
const roleLabel = computed(() => roleMap[userStore.user?.role || ''] || '')

const statusMap: Record<string, string> = {
  pending: '待支付',
  accepted: '待配送',
  made: '待配送',
  delivering: '配送中',
  delivered: '已完成',
  completed: '已完成',
  cancelled: '已取消',
}

async function fetchOrders() {
  if (userStore.user?.role !== 'delivery') {
    orders.value = []
    return
  }
  const data = await orderApi.list({ pageSize: 50 })
  orders.value = (data.list || []).filter((o: any) => ['made', 'delivering'].includes(o.status))
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
}

async function handleDeliveryStart(id: number) {
  await orderApi.deliveryStart(id)
  uni.showToast({ title: '已开始配送', icon: 'success' })
  fetchOrders()
}

async function handleDeliveryComplete(id: number) {
  await orderApi.deliveryComplete(id)
  uni.showToast({ title: '已送达', icon: 'success' })
  fetchOrders()
}

onShow(() => {
  userStore.checkLogin()
  fetchOrders()
})
</script>

<style scoped>
.container { min-height: 100vh; padding: 10px; padding-bottom: 100rpx; box-sizing: border-box; background: #f4f7f2; }
.role-header { background: #2f8a5a; padding: 20px; border-radius: 10px; margin-bottom: 10px; }
.role-title { color: #fff; font-size: 18px; font-weight: bold; }
.section { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; display: block; }
.order-card { padding: 12px 0; border-bottom: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.order-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.order-no { font-size: 13px; color: #333; }
.order-status { font-size: 12px; color: #2f8a5a; }
.order-actions { display: flex; gap: 6px; flex-shrink: 0; }
.mini-btn { font-size: 12px; padding: 4px 10px; background: #2f8a5a; color: #fff; border: none; border-radius: 4px; }
.mini-btn.primary { background: #67C23A; }
.empty { display: block; text-align: center; padding: 24px 0; color: #999; font-size: 14px; }
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: #fff; border-top: 1px solid #eee; }
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 10px; font-size: 12px; }
.nav-icon { font-size: 22px; }
</style>

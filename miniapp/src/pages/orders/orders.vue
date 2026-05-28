<template>
  <view class="container">
    <view v-if="orders.length === 0" class="empty">
      <text>暂无订单</text>
    </view>
    <view v-for="order in orders" :key="order.id" class="order-card" @click="goDetail(order.id)">
      <view class="order-header">
        <text class="order-no">{{ order.orderNo }}</text>
        <text :class="['order-status', 'status-' + order.status]">{{ statusMap[order.status] }}</text>
      </view>
      <view v-for="item in order.items" :key="item.id" class="order-item">
        <text>{{ item.product?.name }} x{{ item.quantity }}</text>
      </view>
      <view class="order-footer">
        <text class="order-total">合计: ¥{{ Number(order.totalAmount).toFixed(2) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onShow } from 'vue'
import { orderApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const orders = ref<any[]>([])

const statusMap: Record<string, string> = {
  pending: '待接单', accepted: '已接单', making: '制作中',
  made: '已制作', delivering: '配送中', delivered: '已完成', cancelled: '已取消',
}

async function fetchOrders() {
  if (!userStore.isLoggedIn) return
  const data = await orderApi.list({ pageSize: 50 })
  orders.value = data.list
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
}

onShow(fetchOrders)
</script>

<style scoped>
.container { padding: 10px; }
.order-card { background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
.order-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.order-no { font-size: 14px; color: #333; }
.order-status { font-size: 13px; font-weight: bold; }
.status-pending { color: #e6a23c; }
.status-accepted { color: #909399; }
.status-making { color: #409EFF; }
.status-delivering { color: #67C23A; }
.status-delivered { color: #67C23A; }
.status-cancelled { color: #f56c6c; }
.order-item { font-size: 13px; color: #666; padding: 2px 0; }
.order-footer { text-align: right; margin-top: 8px; }
.order-total { font-size: 15px; font-weight: bold; color: #f56c6c; }
.empty { text-align: center; padding: 100px 0; color: #999; }
</style>

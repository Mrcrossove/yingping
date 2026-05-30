<template>
  <view class="container">
    <view v-if="!order" class="empty"><text>加载中...</text></view>
    <template v-else>
      <view class="section">
        <view class="row"><text class="label">订单号</text><text>{{ order.orderNo }}</text></view>
        <view class="row"><text class="label">状态</text><text class="status">{{ statusMap[order.status] }}</text></view>
        <view class="row"><text class="label">金额</text><text class="price">¥{{ Number(order.totalAmount).toFixed(2) }}</text></view>
        <view class="row" v-if="order.note"><text class="label">备注</text><text>{{ order.note }}</text></view>
      </view>

      <view class="section">
        <text class="section-title">商品明细</text>
        <view v-for="item in order.items" :key="item.id" class="item-row">
          <text>{{ item.product?.name }} x{{ item.quantity }}</text>
          <text>¥{{ (Number(item.price) * item.quantity).toFixed(2) }}</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">流转记录</text>
        <view v-for="(flow, i) in order.flows" :key="i" class="flow-item">
          <text class="flow-action">{{ flow.action }}</text>
          <text class="flow-time">{{ flow.createdAt }}</text>
        </view>
      </view>

      <!-- 员工操作 -->
      <view v-if="canOperate" class="action-bar">
        <button v-if="order.status === 'making'" @click="handleMakerComplete" class="action-btn">制作完成</button>
        <button v-if="order.status === 'delivering'" @click="handleDeliveryComplete" class="action-btn">确认送达</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const order = ref<any>(null)

const statusMap: Record<string, string> = {
  pending: '待接单', accepted: '已接单', making: '制作中',
  made: '已制作', delivering: '配送中', delivered: '已完成', cancelled: '已取消',
}

const canOperate = computed(() => {
  if (!order.value || !userStore.user) return false
  const role = userStore.user.role
  if (role === 'maker' && order.value.status === 'making') return true
  if (role === 'delivery' && order.value.status === 'delivering') return true
  return false
})

onLoad(async (options: any) => {
  const id = options.id || options.productId
  if (!id) return
  order.value = await orderApi.detail(+id)
})

async function handleMakerComplete() {
  await orderApi.makerComplete(order.value.id)
  uni.showToast({ title: '制作完成', icon: 'success' })
  order.value = await orderApi.detail(order.value.id)
}

async function handleDeliveryComplete() {
  await orderApi.deliveryComplete(order.value.id)
  uni.showToast({ title: '已送达', icon: 'success' })
  order.value = await orderApi.detail(order.value.id)
}
</script>

<style scoped>
.container { padding: 10px; }
.section { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.label { color: #999; }
.price { color: #f56c6c; font-weight: bold; }
.status { color: #409EFF; font-weight: bold; }
.section-title { font-size: 15px; font-weight: bold; margin-bottom: 8px; display: block; }
.item-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.flow-item { padding: 4px 0; border-left: 2px solid #409EFF; padding-left: 10px; margin-bottom: 8px; }
.flow-action { font-size: 13px; font-weight: bold; display: block; }
.flow-time { font-size: 11px; color: #999; }
.action-bar { margin-top: 20px; }
.action-btn { background: #409EFF; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 16px; }
.empty { text-align: center; padding: 60px 0; color: #999; }
</style>

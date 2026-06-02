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

      <view v-if="order.receiverName || order.receiverPhone || order.receiverAddress" class="section">
        <text class="section-title">收货信息</text>
        <view class="row" v-if="order.receiverName"><text class="label">收货人</text><text>{{ order.receiverName }}</text></view>
        <view class="row" v-if="order.receiverPhone"><text class="label">电话</text><text>{{ order.receiverPhone }}</text></view>
        <view class="address-row" v-if="order.receiverAddress">
          <text class="label">地址</text>
          <text class="address-text">{{ order.receiverAddress }}</text>
        </view>
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
        <button v-if="canMerchantCancel" @click="handleCancel" class="action-btn danger">取消订单</button>
        <button v-if="canPay" @click="handlePay" class="action-btn primary">去支付</button>
        <button v-if="canReorder" @click="handleReorder" class="action-btn">再次下单</button>
        <button v-if="userStore.user?.role === 'salesperson' && order.status === 'pending'" @click="handleAccept" class="action-btn">接单</button>
        <button v-if="canDispatchMaker" @click="handleDispatchMaker" class="action-btn primary">派单制作</button>
        <button v-if="canDispatchDelivery" @click="handleDispatchDelivery" class="action-btn primary">派单配送</button>
        <button v-if="userStore.user?.role === 'maker' && order.status === 'making'" @click="handleMakerStart" class="action-btn">开始制作</button>
        <button v-if="userStore.user?.role === 'maker' && order.status === 'making'" @click="handleMakerComplete" class="action-btn primary">制作完成</button>
        <button v-if="userStore.user?.role === 'delivery' && order.status === 'made'" @click="handleDeliveryStart" class="action-btn">去配送</button>
        <button v-if="userStore.user?.role === 'delivery' && order.status === 'delivering'" @click="handleDeliveryComplete" class="action-btn primary">确认送达</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi } from '@/api/index'
import { userApi } from '@/api/index'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const cartStore = useCartStore()
const order = ref<any>(null)

const statusMap: Record<string, string> = {
  pending: '待接单', accepted: '已接单', making: '制作中',
  made: '已制作', delivering: '配送中', delivered: '已完成', completed: '已完结', cancelled: '已取消',
}

const canOperate = computed(() => {
  if (!order.value || !userStore.user) return false
  const role = userStore.user.role
  if (role === 'merchant' && ['pending', 'completed', 'delivered'].includes(order.value.status)) return true
  if (role === 'salesperson' && ['pending', 'accepted', 'made'].includes(order.value.status)) return true
  if (role === 'maker' && (order.value.status === 'making')) return true
  if (role === 'delivery' && (order.value.status === 'made' || order.value.status === 'delivering')) return true
  return false
})

const canMerchantCancel = computed(() => userStore.user?.role === 'merchant' && order.value?.status === 'pending')
const canPay = computed(() => userStore.user?.role === 'merchant' && order.value?.status === 'pending')
const canReorder = computed(() => userStore.user?.role === 'merchant' && ['completed', 'delivered'].includes(order.value?.status))
const canDispatchMaker = computed(() => userStore.user?.role === 'salesperson' && order.value?.status === 'accepted')
const canDispatchDelivery = computed(() => userStore.user?.role === 'salesperson' && order.value?.status === 'made')

onLoad(async (options: any) => {
  const id = options.id || options.productId
  if (!id) return
  order.value = await orderApi.detail(+id)
})

async function refreshOrder() {
  order.value = await orderApi.detail(order.value.id)
}

async function handleAccept() {
  await orderApi.accept(order.value.id)
  uni.showToast({ title: '接单成功', icon: 'success' })
  await refreshOrder()
}

async function handleDispatchMaker() {
  const maker = await selectDispatchStaff('maker')
  if (!maker) return
  await orderApi.dispatchToMaker(order.value.id, maker.id)
  uni.showToast({ title: '派单成功', icon: 'success' })
  await refreshOrder()
}

async function handleDispatchDelivery() {
  const delivery = await selectDispatchStaff('delivery')
  if (!delivery) return
  await orderApi.dispatchToDelivery(order.value.id, delivery.id)
  uni.showToast({ title: '派单成功', icon: 'success' })
  await refreshOrder()
}

async function selectDispatchStaff(role: 'maker' | 'delivery') {
  const label = role === 'maker' ? '制作员' : '配送员'
  const list = await userApi.dispatchStaff(role)
  if (!list.length) {
    uni.showToast({ title: `暂无可用${label}`, icon: 'none' })
    return null
  }
  return new Promise<any>((resolve) => {
    uni.showActionSheet({
      itemList: list.map((item: any) => item.phone ? `${item.realName} (${item.phone})` : item.realName),
      success: (res: any) => resolve(list[res.tapIndex]),
      fail: () => resolve(null),
    })
  })
}

async function handleCancel() {
  await orderApi.cancel(order.value.id)
  uni.showToast({ title: '订单已取消', icon: 'success' })
  await refreshOrder()
}

function handlePay() {
  uni.showToast({ title: '支付暂未开通，请联系商家处理', icon: 'none' })
}

function handleReorder() {
  order.value.items.forEach((item: any) => {
    cartStore.addItem({
      productId: item.productId,
      name: item.product?.name || '商品',
      price: Number(item.price),
      image: item.product?.image,
      quantity: item.quantity,
      checked: true,
    })
  })
  uni.switchTab({ url: '/pages/cart/cart' })
}

async function handleMakerStart() {
  await orderApi.makerStart(order.value.id)
  uni.showToast({ title: '开始制作', icon: 'success' })
  await refreshOrder()
}

async function handleMakerComplete() {
  await orderApi.makerComplete(order.value.id)
  uni.showToast({ title: '制作完成', icon: 'success' })
  await refreshOrder()
}

async function handleDeliveryStart() {
  await orderApi.deliveryStart(order.value.id)
  uni.showToast({ title: '开始配送', icon: 'success' })
  await refreshOrder()
}

async function handleDeliveryComplete() {
  await orderApi.deliveryComplete(order.value.id)
  uni.showToast({ title: '已送达', icon: 'success' })
  await refreshOrder()
}
</script>

<style scoped>
.container { padding: 10px; }
.section { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.address-row { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 14px; }
.address-text { flex: 1; text-align: right; color: #333; line-height: 1.5; }
.label { color: #999; }
.price { color: #f56c6c; font-weight: bold; }
.status { color: #409EFF; font-weight: bold; }
.section-title { font-size: 15px; font-weight: bold; margin-bottom: 8px; display: block; }
.item-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.flow-item { padding: 4px 0; border-left: 2px solid #409EFF; padding-left: 10px; margin-bottom: 8px; }
.flow-action { font-size: 13px; font-weight: bold; display: block; }
.flow-time { font-size: 11px; color: #999; }
.action-bar { margin-top: 20px; }
.action-btn { background: #409EFF; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 16px; margin-bottom: 8px; display: block; width: 100%; }
.action-btn.primary { background: #67C23A; }
.action-btn.danger { background: #f56c6c; }
.empty { text-align: center; padding: 60px 0; color: #999; }
</style>

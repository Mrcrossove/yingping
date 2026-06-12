<template>
  <view class="container">
    <view v-if="!order" class="empty"><text>加载中...</text></view>
    <template v-else>
      <view class="section">
        <view class="row"><text class="label">订单号</text><text>{{ order.orderNo }}</text></view>
        <view class="row"><text class="label">状态</text><text class="status">{{ statusMap[order.status] }}</text></view>
        <view class="row"><text class="label">结算方式</text><text>{{ settlementTypeText }}</text></view>
        <view class="row"><text class="label">结算状态</text><text class="status">{{ settlementStatusText }}</text></view>
        <view class="row"><text class="label">支付状态</text><text class="status">{{ paymentStatusText }}</text></view>
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

      <view v-if="reviews.length > 0" class="section">
        <text class="section-title">订单评价</text>
        <view v-for="review in reviews" :key="review.id" class="review-item">
          <text class="review-rating">{{ '★'.repeat(review.rating) }}</text>
          <text class="review-content">{{ review.content || '暂无文字评价' }}</text>
        </view>
      </view>

      <view v-if="canReview" class="section">
        <text class="section-title">评价订单</text>
        <view class="rating-row">
          <text
            v-for="star in 5"
            :key="star"
            :class="['star', { active: reviewForm.rating >= star }]"
            @click="reviewForm.rating = star"
          >★</text>
        </view>
        <textarea v-model="reviewForm.content" class="review-input" placeholder="写下本次服务体验 (选填)" />
        <button class="action-btn primary" @click="handleReview">提交评价</button>
      </view>

      <!-- 员工操作 -->
      <view v-if="canOperate" class="action-bar">
        <button v-if="canMerchantCancel" @click="handleCancel" class="action-btn danger">取消订单</button>
        <button v-if="canRequestRefund" @click="handleRequestRefund" class="action-btn danger">申请退款</button>
        <button v-if="canPay" @click="handlePay" class="action-btn primary">去支付</button>
        <button v-if="isRefunding" class="action-btn disabled" disabled>退款中</button>
        <button v-if="isRefunded" class="action-btn disabled" disabled>已退款</button>
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
import { orderApi, paymentApi, reviewApi, userApi } from '@/api/index'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { isPaymentCanceled, requestOrderPayment } from '@/utils/payment'

const userStore = useUserStore()
const cartStore = useCartStore()
const order = ref<any>(null)
const reviews = ref<any[]>([])
const reviewForm = ref({ rating: 5, content: '' })

const statusMap: Record<string, string> = {
  pending: '待接单', accepted: '已接单', making: '制作中',
  made: '已制作', delivering: '配送中', delivered: '已完成', completed: '已完结', cancelled: '已取消',
}
const paymentStatusMap: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  refunding: '退款中',
  refunded: '已退款',
  failed: '支付失败',
}
const settlementStatusMap: Record<string, string> = {
  unpaid: '未支付',
  paid: '已支付',
  monthly_pending: '月结待结算',
  monthly_settled: '月结已结算',
  refunding: '退款中',
  refunded: '已退款',
}

const canOperate = computed(() => {
  if (!order.value || !userStore.user) return false
  const role = userStore.user.role
  if (role === 'merchant' && ['pending', 'completed', 'delivered', 'cancelled'].includes(order.value.status)) return true
  if (role === 'salesperson' && ['pending', 'accepted', 'made'].includes(order.value.status)) return true
  if (role === 'maker' && (order.value.status === 'making')) return true
  if (role === 'delivery' && (order.value.status === 'made' || order.value.status === 'delivering')) return true
  return false
})

const paymentStatus = computed(() => order.value?.payment?.status || '')
const settlementTypeText = computed(() => order.value?.settlementType === 'monthly' ? '月结' : '微信支付')
const settlementStatusText = computed(() => settlementStatusMap[order.value?.settlementStatus] || order.value?.settlementStatus || '-')
const paymentStatusText = computed(() => order.value?.settlementType === 'monthly' ? '-' : (paymentStatus.value ? paymentStatusMap[paymentStatus.value] || paymentStatus.value : '未创建支付单'))
const isPaid = computed(() => paymentStatus.value === 'paid')
const isRefunding = computed(() => paymentStatus.value === 'refunding')
const isRefunded = computed(() => paymentStatus.value === 'refunded')
const canMerchantCancel = computed(() => userStore.user?.role === 'merchant' && order.value?.status === 'pending' && !isPaid.value && !isRefunding.value && !isRefunded.value)
const canRequestRefund = computed(() => userStore.user?.role === 'merchant' && order.value?.status === 'pending' && isPaid.value)
const canPay = computed(() =>
  userStore.user?.role === 'merchant'
  && order.value?.status === 'pending'
  && order.value?.settlementType !== 'monthly'
  && ['', 'pending', 'failed'].includes(paymentStatus.value)
)
const canReorder = computed(() => userStore.user?.role === 'merchant' && ['completed', 'delivered'].includes(order.value?.status))
const canDispatchMaker = computed(() => userStore.user?.role === 'salesperson' && order.value?.status === 'accepted')
const canDispatchDelivery = computed(() => userStore.user?.role === 'salesperson' && order.value?.status === 'made')
const canReview = computed(() =>
  userStore.user?.role === 'merchant'
  && ['completed', 'delivered'].includes(order.value?.status)
  && reviews.value.length === 0
)

onLoad(async (options: any) => {
  const id = options.id || options.productId
  if (!id) return
  order.value = await orderApi.detail(+id)
  await fetchReviews(+id)
})

async function refreshOrder() {
  order.value = await orderApi.detail(order.value.id)
  await fetchReviews(order.value.id)
}

async function fetchReviews(orderId: number) {
  try {
    reviews.value = await reviewApi.byOrder(orderId)
  } catch {
    reviews.value = []
  }
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
  uni.showModal({
    title: '取消订单',
    content: '确认取消该未支付订单？',
    success: async (res: any) => {
      if (!res.confirm) return
      await orderApi.cancel(order.value.id)
      uni.showToast({ title: '订单已取消', icon: 'success' })
      await refreshOrder()
    },
  })
}

async function handleRequestRefund() {
  uni.showModal({
    title: '申请退款',
    content: '订单将取消并发起微信原路退款，确认继续？',
    success: async (res: any) => {
      if (!res.confirm) return
      await paymentApi.requestRefund(order.value.id)
      uni.showToast({ title: '退款申请已提交', icon: 'success' })
      await refreshOrder()
    },
  })
}

async function handlePay() {
  try {
    await requestOrderPayment(order.value.id, userStore.user?.openid)
    uni.showToast({ title: '支付成功', icon: 'success' })
    await refreshOrder()
  } catch (error: any) {
    if (isPaymentCanceled(error)) return
    uni.showToast({ title: error?.message || '支付失败，请稍后重试', icon: 'none' })
  }
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

async function handleReview() {
  await reviewApi.create({
    orderId: order.value.id,
    rating: reviewForm.value.rating,
    content: reviewForm.value.content,
  })
  uni.showToast({ title: '评价成功', icon: 'success' })
  reviewForm.value = { rating: 5, content: '' }
  await fetchReviews(order.value.id)
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
.container { min-height: 100vh; padding: 10px; box-sizing: border-box; background: #f4f7f2; }
.section { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.address-row { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 14px; }
.address-text { flex: 1; text-align: right; color: #333; line-height: 1.5; }
.label { color: #999; }
.price { color: #f56c6c; font-weight: bold; }
.status { color: #2f8a5a; font-weight: bold; }
.section-title { font-size: 15px; font-weight: bold; margin-bottom: 8px; display: block; }
.item-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.flow-item { padding: 4px 0; border-left: 2px solid #2f8a5a; padding-left: 10px; margin-bottom: 8px; }
.flow-action { font-size: 13px; font-weight: bold; display: block; }
.flow-time { font-size: 11px; color: #999; }
.action-bar { margin-top: 20px; }
.action-btn { background: #2f8a5a; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 16px; margin-bottom: 8px; display: block; width: 100%; }
.action-btn.primary { background: #67C23A; }
.action-btn.danger { background: #f56c6c; }
.action-btn.disabled { background: #c0c4cc; color: #fff; }
.rating-row { display: flex; gap: 6px; margin-bottom: 10px; }
.star { font-size: 26px; color: #ddd; }
.star.active { color: #f5a623; }
.review-input { width: 100%; min-height: 76px; border: 1px solid #eee; border-radius: 8px; padding: 10px; box-sizing: border-box; font-size: 14px; margin-bottom: 10px; }
.review-item { padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.review-rating { color: #f5a623; display: block; font-size: 16px; }
.review-content { display: block; color: #333; font-size: 14px; margin-top: 4px; }
.empty { text-align: center; padding: 60px 0; color: #999; }
</style>

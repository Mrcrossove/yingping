<template>
  <view class="container">
    <view class="role-header">
      <text class="role-title">{{ roleLabel }}工作台</text>
    </view>

    <!-- 业务员视图 -->
    <template v-if="userStore.user?.role === 'salesperson'">
      <view class="section">
        <text class="section-title">待处理订单</text>
        <view v-for="o in orders" :key="o.id" class="order-card" @click="goDetail(o.id)">
          <text class="order-no">{{ o.orderNo }}</text>
          <text class="order-status">{{ statusMap[o.status] }}</text>
          <view class="order-actions">
            <button v-if="o.status === 'pending'" @click.stop="handleAccept(o.id)" class="mini-btn">接单</button>
            <button v-if="o.status === 'accepted'" @click.stop="showDispatchMaker(o.id)" class="mini-btn">派单制作</button>
            <button v-if="o.status === 'made'" @click.stop="showDispatchDelivery(o.id)" class="mini-btn">派单配送</button>
          </view>
        </view>
      </view>
      <view class="manual-section">
        <button @click="showManualOrder = true" class="full-btn">手动录单</button>
      </view>
    </template>

    <!-- 制作员视图 -->
    <template v-if="userStore.user?.role === 'maker'">
      <view class="section">
        <text class="section-title">待制作订单</text>
        <view v-for="o in orders" :key="o.id" class="order-card" @click="goDetail(o.id)">
          <text class="order-no">{{ o.orderNo }}</text>
          <text class="order-status">{{ statusMap[o.status] }}</text>
          <view class="order-actions">
            <button v-if="o.status === 'making'" @click.stop="handleMakerComplete(o.id)" class="mini-btn">确认完成</button>
          </view>
        </view>
      </view>
    </template>

    <!-- 配送员视图 -->
    <template v-if="userStore.user?.role === 'delivery'">
      <view class="section">
        <text class="section-title">待配送订单</text>
        <view v-for="o in orders" :key="o.id" class="order-card" @click="goDetail(o.id)">
          <text class="order-no">{{ o.orderNo }}</text>
          <text class="order-status">{{ statusMap[o.status] }}</text>
          <view class="order-actions">
            <button v-if="o.status === 'delivering'" @click.stop="handleDeliveryComplete(o.id)" class="mini-btn">确认送达</button>
          </view>
        </view>
      </view>
    </template>

    <!-- 公共：收益入口 -->
    <view class="bottom-nav">
      <view class="nav-item" @click="uni.navigateTo({ url: '/pages/employee/earnings' })">
        <text class="nav-icon">💰</text>
        <text>收益</text>
      </view>
      <view class="nav-item" @click="uni.navigateTo({ url: '/pages/employee/withdrawal' })">
        <text class="nav-icon">🏦</text>
        <text>提现</text>
      </view>
    </view>

    <!-- 手动录单弹窗 -->
    <view v-if="showManualOrder" class="modal-mask">
      <view class="modal-content">
        <text style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">手动录单</text>
        <input v-model="manualForm.merchantId" placeholder="商户ID" class="form-input" />
        <view class="manual-items">
          <view v-for="(item, i) in manualForm.items" :key="i" class="manual-item">
            <input v-model.number="item.productId" placeholder="商品ID" style="flex:1" />
            <input v-model.number="item.quantity" placeholder="数量" style="width:60px;margin:0 8px" />
            <text @click="removeManualItem(i)" style="color:#f56c6c">删除</text>
          </view>
          <button @click="addManualItem" class="small-btn">+ 添加商品</button>
        </view>
        <view style="display:flex; gap:10px; margin-top:16px;">
          <button @click="showManualOrder = false" style="flex:1">取消</button>
          <button @click="handleManualCreate" style="flex:1; background:#409EFF; color:#fff">确认录单</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onShow } from 'vue'
import { orderApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const uni = (globalThis as any).uni
const userStore = useUserStore()
const orders = ref<any[]>([])
const showManualOrder = ref(false)
const manualForm = ref({ merchantId: '', items: [{ productId: '', quantity: 1 }] })

const roleMap: Record<string, string> = {
  salesperson: '业务员', maker: '制作员', delivery: '配送员', promoter: '推广员',
}
const roleLabel = computed(() => roleMap[userStore.user?.role || ''] || '')

const statusMap: Record<string, string> = {
  pending: '待接单', accepted: '已接单', making: '制作中',
  made: '已制作', delivering: '配送中', delivered: '已完成', cancelled: '已取消',
}

async function fetchOrders() {
  const params: any = { pageSize: 50 }
  if (userStore.user?.role === 'salesperson') params.salespersonId = userStore.user.id
  else if (userStore.user?.role === 'maker') params.makerId = userStore.user.id
  else if (userStore.user?.role === 'delivery') params.deliveryId = userStore.user.id
  const data = await orderApi.list(params)
  // Filter active orders
  orders.value = data.list.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled')
}

function goDetail(id: number) { uni.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` }) }

async function handleAccept(id: number) { await orderApi.accept(id); fetchOrders() }

async function showDispatchMaker(orderId: number) {
  uni.showActionSheet({
    itemList: ['制作员1', '制作员2'],
    success: async (res: any) => { await orderApi.dispatchToMaker(orderId, 0); fetchOrders() },
  })
}

async function showDispatchDelivery(orderId: number) {
  uni.showActionSheet({
    itemList: ['配送员1', '配送员2'],
    success: async (res: any) => { await orderApi.dispatchToDelivery(orderId, 0); fetchOrders() },
  })
}

async function handleMakerComplete(id: number) { await orderApi.makerComplete(id); fetchOrders() }
async function handleDeliveryComplete(id: number) { await orderApi.deliveryComplete(id); fetchOrders() }

function addManualItem() { manualForm.value.items.push({ productId: '', quantity: 1 }) }
function removeManualItem(i: number) { manualForm.value.items.splice(i, 1) }

async function handleManualCreate() {
  const items = manualForm.value.items.map((i: any) => ({
    productId: +i.productId, quantity: +i.quantity,
  }))
  await orderApi.manualCreate({ items, merchantId: +manualForm.value.merchantId })
  uni.showToast({ title: '录单成功', icon: 'success' })
  showManualOrder.value = false
  fetchOrders()
}

onShow(fetchOrders)
</script>

<style scoped>
.container { padding: 10px; padding-bottom: 100rpx; }
.role-header { background: #409EFF; padding: 20px; border-radius: 10px; margin-bottom: 10px; }
.role-title { color: #fff; font-size: 18px; font-weight: bold; }
.section { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; display: block; }
.order-card { padding: 10px; border-bottom: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; }
.order-no { font-size: 13px; color: #333; }
.order-status { font-size: 12px; color: #409EFF; }
.order-actions { display: flex; gap: 6px; }
.mini-btn { font-size: 12px; padding: 4px 10px; background: #409EFF; color: #fff; border: none; border-radius: 4px; }
.full-btn { background: #67C23A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 16px; margin: 10px 0; }
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: #fff; border-top: 1px solid #eee; }
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 10px; font-size: 12px; }
.nav-icon { font-size: 22px; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-content { width: 340px; background: #fff; border-radius: 12px; padding: 20px; }
.form-input { border: 1px solid #eee; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; font-size: 14px; }
.manual-items { margin-top: 10px; }
.manual-item { display: flex; align-items: center; margin-bottom: 8px; }
.manual-item input { border: 1px solid #eee; border-radius: 4px; padding: 4px 8px; font-size: 13px; }
.small-btn { font-size: 12px; padding: 6px; background: #f0f0f0; border: none; border-radius: 4px; }
</style>

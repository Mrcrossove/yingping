<template>
  <div class="order-detail-page">
    <el-page-header @back="$router.push('/orders')" title="返回">
      <template #content>订单详情</template>
    </el-page-header>
    <el-card v-loading="loading" style="margin-top: 16px;" v-if="order">
      <el-descriptions title="基本信息" :column="detailColumns" border>
        <el-descriptions-item label="订单编号">{{ order.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(order.status)">{{ statusMap[order.status] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="商户">{{ order.merchant?.realName }}</el-descriptions-item>
        <el-descriptions-item label="结算商户">{{ order.settlementMerchantName || order.merchant?.realName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="配送员">{{ order.delivery?.realName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ Number(order.totalAmount).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ order.note || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions v-if="order.receiverName || order.receiverAddress" title="收货信息" :column="2" border style="margin-top: 20px;">
        <el-descriptions-item label="收货人">{{ order.receiverName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ order.receiverPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="地图位置">{{ order.receiverLocationName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="经纬度">
          <span v-if="order.receiverLatitude && order.receiverLongitude">{{ order.receiverLatitude }}, {{ order.receiverLongitude }}</span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="收货地址" :span="2">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>{{ order.receiverAddress || '-' }}</span>
            <el-button v-if="order.receiverAddress" size="small" @click="copyAddress">复制地址</el-button>
          </div>
        </el-descriptions-item>
      </el-descriptions>

      <h4 style="margin-top: 20px;">商品明细</h4>
      <el-table v-if="!isMobile" :data="order.items" border>
        <el-table-column prop="product.name" label="商品" />
        <el-table-column prop="quantity" label="数量" width="100" />
        <el-table-column prop="price" label="单价" width="120">
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="小计" width="120">
          <template #default="{ row }">¥{{ (Number(row.price) * row.quantity).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
      <div v-else class="mobile-item-list">
        <article v-for="(item, index) in order.items" :key="index" class="mobile-item-card">
          <div class="mobile-item-head">
            <strong>{{ item.product?.name || '-' }}</strong>
            <span>¥{{ Number(item.price).toFixed(2) }}</span>
          </div>
          <div class="mobile-item-row">数量 x{{ item.quantity }}</div>
          <div class="mobile-item-row">小计 ¥{{ (Number(item.price) * item.quantity).toFixed(2) }}</div>
        </article>
      </div>

      <h4 style="margin-top: 20px;">操作记录</h4>
      <el-timeline>
        <el-timeline-item
          v-for="(flow, i) in order.flows"
          :key="i"
          :timestamp="new Date(flow.createdAt).toLocaleString()"
          placement="top"
        >
          <strong>{{ flow.action }}</strong>
          <span style="color: #909399; margin-left: 8px;">操作人: {{ flow.operator?.realName }} ({{ flow.operator?.role }})</span>
        </el-timeline-item>
      </el-timeline>

      <h4 style="margin-top: 20px;">订单评价</h4>
      <el-table :data="reviews" border>
        <el-table-column label="评分" width="120">
          <template #default="{ row }">{{ '★'.repeat(row.rating) }}</template>
        </el-table-column>
        <el-table-column prop="content" label="评价内容">
          <template #default="{ row }">{{ row.content || '-' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="评价时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
      </el-table>

      <div v-if="canOperate && !isMobile" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
        <template v-if="['accepted', 'made'].includes(order.status) && canDispatch">
          <el-select v-model="deliveryId" placeholder="选择配送员" style="width: 160px;">
            <el-option v-for="d in deliverys" :key="d.id" :label="d.realName" :value="d.id" />
          </el-select>
          <el-button type="primary" :disabled="!deliveryId" @click="handleDispatchDelivery">派单给配送员</el-button>
        </template>
        <template v-if="canDeliver && order.status === 'made'">
          <el-button type="primary" @click="handleDeliveryStart">开始配送</el-button>
        </template>
        <template v-if="canDeliver && order.status === 'delivering'">
          <el-button type="success" @click="handleDeliveryComplete">配送完成</el-button>
        </template>
        <el-button v-if="canCancel" type="danger" @click="handleCancel">取消订单</el-button>
      </div>
      <div v-if="canOperate && isMobile" class="mobile-action-bar">
        <el-select
          v-if="['accepted', 'made'].includes(order.status) && canDispatch"
          v-model="deliveryId"
          placeholder="选择配送员"
          class="mobile-action-select"
        >
          <el-option v-for="d in deliverys" :key="d.id" :label="d.realName" :value="d.id" />
        </el-select>
        <div class="mobile-action-buttons">
          <el-button
            v-if="['accepted', 'made'].includes(order.status) && canDispatch"
            type="primary"
            :disabled="!deliveryId"
            @click="handleDispatchDelivery"
          >
            派单
          </el-button>
          <el-button v-if="canDeliver && order.status === 'made'" type="primary" @click="handleDeliveryStart">开始配送</el-button>
          <el-button v-if="canDeliver && order.status === 'delivering'" type="success" @click="handleDeliveryComplete">配送完成</el-button>
          <el-button v-if="canCancel" type="danger" @click="handleCancel">取消订单</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi, userApi } from '@/api/index'
import { useUserStore } from '@/stores/user'
import request from '@/utils/request'
import { hasPermission } from '@/utils/access'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const isMobile = ref(false)
const order = ref<any>(null)
const reviews = ref<any[]>([])
const deliveryId = ref<number | null>(null)
const deliverys = ref<any[]>([])

const statusMap: Record<string, string> = {
  pending: '待支付', accepted: '待配送',
  made: '待配送', delivering: '配送中', delivered: '待商家确认', completed: '已完成', cancelled: '已取消',
}

function statusTagType(status: string) {
  const map: Record<string, string> = { pending: 'warning', accepted: 'info', made: '', delivering: '', delivered: 'success', completed: 'success', cancelled: 'danger' }
  return map[status] || ''
}

const canDispatch = computed(() =>
  hasPermission('order:dispatch')
)
const canDeliver = computed(() => userStore.role === 'delivery')
const isFinishedOrder = computed(() =>
  ['delivered', 'completed', 'cancelled'].includes(order.value?.status)
)
const canCancel = computed(() =>
  ['boss', 'admin'].includes(userStore.role) && !isFinishedOrder.value
)
const detailColumns = computed(() => (isMobile.value ? 1 : 2))
const canOperate = computed(() =>
  !isFinishedOrder.value && (
    canDispatch.value
    || (canDeliver.value && ['made', 'delivering'].includes(order.value?.status))
  )
)

async function fetchOrder() {
  loading.value = true
  try {
    order.value = await orderApi.detail(+route.params.id)
    reviews.value = await request.get(`/reviews/order/${route.params.id}`)
    if (canDispatch.value && ['accepted', 'made'].includes(order.value.status)) {
      deliverys.value = await userApi.dispatchStaff('delivery')
    }
  } finally {
    loading.value = false
  }
}

function syncViewport() {
  isMobile.value = window.innerWidth <= 768
}

async function handleDispatchDelivery() {
  if (!deliveryId.value) return
  await orderApi.dispatchToDelivery(order.value.id, deliveryId.value)
  ElMessage.success('已派单给配送员')
  fetchOrder()
}

async function handleDeliveryStart() {
  await orderApi.deliveryStart(order.value.id)
  ElMessage.success('已开始配送')
  fetchOrder()
}

async function handleDeliveryComplete() {
  await ElMessageBox.confirm('确认该订单已经配送完成?', '提示', { type: 'warning' })
  await orderApi.deliveryComplete(order.value.id)
  ElMessage.success('配送完成')
  fetchOrder()
}

async function handleCancel() {
  await ElMessageBox.confirm('确定取消此订单?', '提示', { type: 'warning' })
  await orderApi.cancel(order.value.id)
  ElMessage.success('订单已取消')
  fetchOrder()
}

async function copyAddress() {
  const text = [order.value.receiverName, order.value.receiverPhone, order.value.receiverLocationName, order.value.receiverAddress]
    .filter(Boolean)
    .join(' ')
  await navigator.clipboard.writeText(text)
  ElMessage.success('地址已复制')
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  fetchOrder()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})
</script>

<style scoped>
.order-detail-page { min-width: 0; }
.mobile-item-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mobile-item-card {
  border: 1px solid #e6ebf2;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}
.mobile-item-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.mobile-item-head strong {
  min-width: 0;
  color: #1f2937;
  font-size: 14px;
  word-break: break-all;
}
.mobile-item-head span,
.mobile-item-row {
  color: #6b7280;
  font-size: 12px;
}
.mobile-action-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  background: #fff;
}
.mobile-action-select {
  width: 100%;
}
.mobile-action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mobile-action-buttons :deep(.el-button) {
  margin-left: 0;
}

@media (max-width: 768px) {
  .order-detail-page :deep(.el-card__body) {
    overflow-x: visible;
  }
  .order-detail-page :deep(.el-descriptions__body .el-descriptions__table) {
    table-layout: fixed;
  }
  .order-detail-page :deep(.el-timeline) {
    padding-left: 12px;
  }
}
</style>

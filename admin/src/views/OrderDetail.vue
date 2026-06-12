<template>
  <div>
    <el-page-header @back="$router.push('/orders')" title="返回">
      <template #content>订单详情</template>
    </el-page-header>
    <el-card v-loading="loading" style="margin-top: 16px;" v-if="order">
      <el-descriptions title="基本信息" :column="2" border>
        <el-descriptions-item label="订单编号">{{ order.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(order.status)">{{ statusMap[order.status] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="商户">{{ order.merchant?.realName }}</el-descriptions-item>
        <el-descriptions-item label="业务员">{{ order.salesperson?.realName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="制作员">{{ order.maker?.realName || '-' }}</el-descriptions-item>
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
      <el-table :data="order.items" border>
        <el-table-column prop="product.name" label="商品" />
        <el-table-column prop="quantity" label="数量" width="100" />
        <el-table-column prop="price" label="单价" width="120">
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="小计" width="120">
          <template #default="{ row }">¥{{ (Number(row.price) * row.quantity).toFixed(2) }}</template>
        </el-table-column>
      </el-table>

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

      <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;" v-if="canOperate">
        <template v-if="order.status === 'pending'">
          <el-button type="primary" @click="handleAccept">确认接单</el-button>
        </template>
        <template v-if="order.status === 'accepted' && canDispatch">
          <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-select v-model="makerId" placeholder="选择制作员" style="width: 160px;">
                <el-option v-for="m in makers" :key="m.id" :label="m.realName" :value="m.id" />
              </el-select>
              <el-select v-model="deliveryId" placeholder="选择配送员" style="width: 160px;">
                <el-option v-for="d in deliverys" :key="d.id" :label="d.realName" :value="d.id" />
              </el-select>
              <el-button type="primary" :disabled="!makerId || !deliveryId" @click="handleDispatchBoth">同时派单</el-button>
            </div>
            <div style="font-size: 12px; color: #999;">或单独操作：</div>
            <div style="display: flex; gap: 8px;">
              <el-button size="small" :disabled="!makerId" @click="handleDispatchMaker">仅派制作员</el-button>
            </div>
          </div>
        </template>
        <template v-if="order.status === 'made' && canDispatch">
          <el-select v-model="deliveryId" placeholder="选择配送员" style="width: 160px;">
            <el-option v-for="d in deliverys" :key="d.id" :label="d.realName" :value="d.id" />
          </el-select>
          <el-button type="primary" :disabled="!deliveryId" @click="handleDispatchDelivery">派单给配送员</el-button>
        </template>
        <template v-if="canMake && order.status === 'making'">
          <el-button v-if="!hasStartedMaking" type="primary" @click="handleMakerStart">开始制作</el-button>
          <el-button type="success" @click="handleMakerComplete">制作完成</el-button>
        </template>
        <template v-if="canDeliver && order.status === 'made'">
          <el-button type="primary" @click="handleDeliveryStart">开始配送</el-button>
        </template>
        <template v-if="canDeliver && order.status === 'delivering'">
          <el-button type="success" @click="handleDeliveryComplete">配送完成</el-button>
        </template>
        <el-button v-if="canCancel" type="danger" @click="handleCancel">取消订单</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
const order = ref<any>(null)
const reviews = ref<any[]>([])
const makerId = ref<number | null>(null)
const deliveryId = ref<number | null>(null)
const makers = ref<any[]>([])
const deliverys = ref<any[]>([])

const statusMap: Record<string, string> = {
  pending: '待接单', accepted: '已接单', making: '制作中',
  made: '已制作', delivering: '配送中', delivered: '已完成', completed: '已完结', cancelled: '已取消',
}

function statusTagType(status: string) {
  const map: Record<string, string> = { pending: 'warning', accepted: 'info', making: '', made: '', delivering: '', delivered: 'success', completed: 'success', cancelled: 'danger' }
  return map[status] || ''
}

const canDispatch = computed(() =>
  ['boss', 'admin', 'salesperson'].includes(userStore.role) && hasPermission('order:dispatch')
)
const canMake = computed(() => userStore.role === 'maker')
const canDeliver = computed(() => userStore.role === 'delivery')
const isFinishedOrder = computed(() =>
  ['delivered', 'completed', 'cancelled'].includes(order.value?.status)
)
const canCancel = computed(() =>
  ['boss', 'admin', 'salesperson'].includes(userStore.role) && !isFinishedOrder.value
)
const canOperate = computed(() =>
  !isFinishedOrder.value && (
    ['boss', 'admin', 'salesperson'].includes(userStore.role)
    || (canMake.value && order.value?.status === 'making')
    || (canDeliver.value && ['made', 'delivering'].includes(order.value?.status))
  )
)
const hasStartedMaking = computed(() =>
  order.value?.flows?.some((flow: any) => flow.action === '开始制作')
)

async function fetchOrder() {
  loading.value = true
  try {
    order.value = await orderApi.detail(+route.params.id)
    reviews.value = await request.get(`/reviews/order/${route.params.id}`)
    if (canDispatch.value && order.value.status === 'accepted') {
      makers.value = await userApi.dispatchStaff('maker')
      deliverys.value = await userApi.dispatchStaff('delivery')
    }
    if (canDispatch.value && order.value.status === 'made') {
      deliverys.value = await userApi.dispatchStaff('delivery')
    }
  } finally {
    loading.value = false
  }
}

async function handleAccept() {
  await orderApi.accept(order.value.id)
  ElMessage.success('接单成功')
  fetchOrder()
}

async function handleDispatchMaker() {
  if (!makerId.value) return
  await orderApi.dispatchToMaker(order.value.id, makerId.value)
  ElMessage.success('已派单给制作员')
  fetchOrder()
}

async function handleDispatchBoth() {
  if (!makerId.value || !deliveryId.value) return
  await orderApi.dispatchBoth(order.value.id, makerId.value, deliveryId.value)
  ElMessage.success('已同时派单给制作员和配送员')
  fetchOrder()
}

async function handleDispatchDelivery() {
  if (!deliveryId.value) return
  await orderApi.dispatchToDelivery(order.value.id, deliveryId.value)
  ElMessage.success('已派单给配送员')
  fetchOrder()
}

async function handleMakerStart() {
  await orderApi.makerStart(order.value.id)
  ElMessage.success('已开始制作')
  fetchOrder()
}

async function handleMakerComplete() {
  await ElMessageBox.confirm('确认该订单已经制作完成?', '提示', { type: 'warning' })
  await orderApi.makerComplete(order.value.id)
  ElMessage.success('制作完成，已通知业务员派送')
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

onMounted(fetchOrder)
</script>

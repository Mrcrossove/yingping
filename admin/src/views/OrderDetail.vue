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

      <div style="margin-top: 20px; display: flex; gap: 10px;" v-if="canOperate">
        <template v-if="order.status === 'pending'">
          <el-button type="primary" @click="handleAccept">确认接单</el-button>
        </template>
        <template v-if="order.status === 'accepted'">
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
        <template v-if="order.status === 'made'">
          <el-select v-model="deliveryId" placeholder="选择配送员" style="width: 160px;">
            <el-option v-for="d in deliverys" :key="d.id" :label="d.realName" :value="d.id" />
          </el-select>
          <el-button type="primary" :disabled="!deliveryId" @click="handleDispatchDelivery">派单给配送员</el-button>
        </template>
        <el-button v-if="order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'cancelled'" type="danger" @click="handleCancel">取消订单</el-button>
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

const canOperate = computed(() =>
  ['boss', 'admin', 'salesperson'].includes(userStore.role) && order.value?.status !== 'delivered' && order.value?.status !== 'completed' && order.value?.status !== 'cancelled'
)

async function fetchOrder() {
  loading.value = true
  try {
    order.value = await orderApi.detail(+route.params.id)
    reviews.value = await request.get(`/reviews/order/${route.params.id}`)
    if (order.value.status === 'accepted') {
      makers.value = (await userApi.list({ role: 'maker', pageSize: 100 })).list
      deliverys.value = (await userApi.list({ role: 'delivery', pageSize: 100 })).list
    }
    if (order.value.status === 'made') {
      deliverys.value = (await userApi.list({ role: 'delivery', pageSize: 100 })).list
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

async function handleCancel() {
  await ElMessageBox.confirm('确定取消此订单?', '提示', { type: 'warning' })
  await orderApi.cancel(order.value.id)
  ElMessage.success('订单已取消')
  fetchOrder()
}

onMounted(fetchOrder)
</script>

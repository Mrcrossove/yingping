<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>订单管理</span>
          <div>
            <el-select v-model="filterStatus" placeholder="订单状态" clearable style="width: 130px; margin-right: 10px;">
              <el-option v-for="(v, k) in statusMap" :key="k" :label="v" :value="k" />
            </el-select>
            <el-input v-model="keyword" placeholder="搜索订单号" clearable style="width: 200px; margin-right: 10px;" @keyup.enter="fetchOrders" />
            <el-button type="primary" @click="fetchOrders">查询</el-button>
            <el-button type="success" @click="handleExport" style="margin-left: 8px;">导出Excel</el-button>
          </div>
        </div>
      </template>
      <div style="margin-bottom: 12px;" v-if="selectedOrders.length > 0">
        <el-button type="warning" @click="showBatchDialog">批量派单 ({{ selectedOrders.length }} 单)</el-button>
      </div>
      <el-table :data="orders" v-loading="loading" stripe @selection-change="onSelectionChange" ref="orderTable">
        <el-table-column type="selection" width="40" :selectable="isSelectable" />
        <el-table-column prop="orderNo" label="订单编号" width="200" />
        <el-table-column prop="merchant.realName" label="商户" width="100" />
        <el-table-column label="商品">
          <template #default="{ row }">
            <span v-for="(item, i) in row.items" :key="i">
              {{ item.product?.name }} x{{ item.quantity }}<span v-if="i < row.items.length - 1">, </span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="金额" width="100">
          <template #default="{ row }">¥{{ Number(row.totalAmount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="salesperson.realName" label="业务员" width="100" />
        <el-table-column prop="maker.realName" label="制作员" width="100" />
        <el-table-column prop="delivery.realName" label="配送员" width="100" />
        <el-table-column prop="createdAt" label="下单时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/orders/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 16px; text-align: right;">
        <el-pagination
          v-model:current-page="page" :page-size="pageSize" :total="total"
          layout="total, prev, pager, next" @current-change="fetchOrders"
        />
      </div>
    </el-card>

    <el-dialog v-model="batchVisible" title="批量派单" width="450px">
      <el-form label-width="80px">
        <el-form-item label="已选">已选择 {{ selectedOrders.length }} 个订单</el-form-item>
        <el-form-item label="制作员">
          <el-select v-model="batchMakerId" placeholder="选择制作员" style="width:100%">
            <el-option v-for="m in makers" :key="m.id" :label="m.realName" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="配送员">
          <el-select v-model="batchDeliveryId" placeholder="选择配送员" style="width:100%">
            <el-option v-for="d in deliverys" :key="d.id" :label="d.realName" :value="d.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!batchMakerId || !batchDeliveryId" @click="handleBatchDispatch">确认派单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { orderApi, exportApi, userApi } from '@/api/index'

const loading = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const filterStatus = ref('')

const statusMap: Record<string, string> = {
  pending: '待接单', accepted: '已接单', making: '制作中',
  made: '已制作', delivering: '配送中', delivered: '已完成', cancelled: '已取消',
}

function statusTagType(status: string) {
  const map: Record<string, string> = { pending: 'warning', accepted: 'info', making: '', made: '', delivering: '', delivered: 'success', cancelled: 'danger' }
  return map[status] || ''
}

async function fetchOrders() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (filterStatus.value) params.status = filterStatus.value
    const data = await orderApi.list(params)
    orders.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function handleExport() {
  const params: any = {}
  if (filterStatus.value) params.status = filterStatus.value
  const token = localStorage.getItem('token')
  const url = exportApi.orders(params)
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('download', '')
  a.click()
}

const selectedOrders = ref<any[]>([])
const batchVisible = ref(false)
const batchMakerId = ref<number | null>(null)
const batchDeliveryId = ref<number | null>(null)
const makers = ref<any[]>([])
const deliverys = ref<any[]>([])

function isSelectable(row: any) { return row.status === 'accepted' }
function onSelectionChange(val: any[]) { selectedOrders.value = val }

async function showBatchDialog() {
  const batches = await Promise.all([userApi.list({ role: 'maker', pageSize: 100 }), userApi.list({ role: 'delivery', pageSize: 100 })])
  makers.value = batches[0].list; deliverys.value = batches[1].list
  batchVisible.value = true
}

async function handleBatchDispatch() {
  if (!batchMakerId.value || !batchDeliveryId.value) return
  const orderIds = selectedOrders.value.map(o => o.id)
  await (orderApi as any).batchDispatch(orderIds, batchMakerId.value, batchDeliveryId.value)
  ElMessage.success('批量派单完成')
  batchVisible.value = false
  selectedOrders.value = []
  fetchOrders()
}

onMounted(fetchOrders)
</script>

<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>订单管理</span>
        </div>
      </template>
      <div class="filter-bar">
        <el-input v-model="keyword" placeholder="订单号" clearable class="filter-item keyword-input" @keyup.enter="handleSearch" />
        <el-select v-model="filterStatus" placeholder="订单状态" clearable class="filter-item status-select">
          <el-option v-for="(v, k) in statusMap" :key="k" :label="v" :value="k" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          class="filter-item date-range"
        />
        <el-select v-model="staffRole" placeholder="人员类型" clearable class="filter-item staff-role" @change="handleStaffRoleChange">
          <el-option label="商户" value="merchant" />
          <el-option label="业务员" value="salesperson" />
          <el-option label="制作员" value="maker" />
          <el-option label="配送员" value="delivery" />
        </el-select>
        <el-select
          v-model="staffId"
          placeholder="选择人员"
          clearable
          filterable
          :disabled="!staffRole"
          :loading="staffLoading"
          class="filter-item staff-select"
        >
          <el-option
            v-for="item in staffOptions"
            :key="item.id"
            :label="item.phone ? `${item.realName} (${item.phone})` : item.realName"
            :value="item.id"
          />
        </el-select>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button v-if="canExport" type="success" @click="handleExport">导出Excel</el-button>
      </div>
      <div style="margin-bottom: 12px;" v-if="canDispatch && selectedOrders.length > 0">
        <el-button type="warning" @click="showBatchDialog">批量派单 ({{ selectedOrders.length }} 单)</el-button>
      </div>
      <el-table :data="orders" v-loading="loading" stripe @selection-change="onSelectionChange" ref="orderTable">
        <el-table-column v-if="canDispatch" type="selection" width="40" :selectable="isSelectable" />
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
        <el-table-column v-if="showStaffColumns" prop="salesperson.realName" label="业务员" width="100" />
        <el-table-column v-if="showStaffColumns" prop="maker.realName" label="制作员" width="100" />
        <el-table-column v-if="showStaffColumns" prop="delivery.realName" label="配送员" width="100" />
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
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { orderApi, exportApi, userApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const filterStatus = ref('')
const dateRange = ref<[string, string] | null>(null)
const staffRole = ref('')
const staffId = ref<number | null>(null)
const staffOptions = ref<any[]>([])
const staffLoading = ref(false)
const role = computed(() => userStore.role)
const canDispatch = computed(() => ['boss', 'admin', 'salesperson'].includes(role.value))
const canExport = computed(() => ['boss', 'admin'].includes(role.value))
const showStaffColumns = computed(() => ['boss', 'admin', 'salesperson'].includes(role.value))

const statusMap: Record<string, string> = {
  pending: '待接单', accepted: '已接单', making: '制作中',
  made: '已制作', delivering: '配送中', delivered: '已送达', completed: '已完成', cancelled: '已取消',
}

function statusTagType(status: string) {
  const map: Record<string, string> = { pending: 'warning', accepted: 'info', making: '', made: '', delivering: '', delivered: 'success', completed: 'success', cancelled: 'danger' }
  return map[status] || ''
}

function buildQueryParams() {
  const params: any = {}
  if (keyword.value.trim()) params.keyword = keyword.value.trim()
  if (filterStatus.value) params.status = filterStatus.value
  if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
  if (dateRange.value?.[1]) params.endDate = dateRange.value[1]
  if (staffRole.value && staffId.value) {
    const keyMap: Record<string, string> = {
      merchant: 'merchantId',
      salesperson: 'salespersonId',
      maker: 'makerId',
      delivery: 'deliveryId',
    }
    params[keyMap[staffRole.value]] = staffId.value
  }
  return params
}

async function fetchOrders() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value, ...buildQueryParams() }
    const data = await orderApi.list(params)
    orders.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  fetchOrders()
}

function handleReset() {
  keyword.value = ''
  filterStatus.value = ''
  dateRange.value = null
  staffRole.value = ''
  staffId.value = null
  staffOptions.value = []
  page.value = 1
  fetchOrders()
}

async function handleStaffRoleChange() {
  staffId.value = null
  staffOptions.value = []
  if (!staffRole.value) return
  staffLoading.value = true
  try {
    const data = await userApi.list({ role: staffRole.value, pageSize: 500 })
    staffOptions.value = data.list || []
  } finally {
    staffLoading.value = false
  }
}

function handleExport() {
  if (!canExport.value) return
  const params = buildQueryParams()
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

function isSelectable(row: any) { return canDispatch.value && row.status === 'accepted' }
function onSelectionChange(val: any[]) { selectedOrders.value = val }

async function showBatchDialog() {
  if (!canDispatch.value) return
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

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.filter-item { flex-shrink: 0; }
.keyword-input { width: 180px; }
.status-select { width: 130px; }
.date-range { width: 260px; }
.staff-role { width: 120px; }
.staff-select { width: 210px; }
</style>

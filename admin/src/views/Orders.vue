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
        <el-input
          v-model="settlementMerchantName"
          placeholder="结算商户"
          clearable
          class="filter-item settlement-merchant-input"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="filterStatus" placeholder="订单状态" clearable class="filter-item status-select">
          <el-option v-for="(v, k) in statusMap" :key="k" :label="v" :value="k" />
        </el-select>
        <el-select v-model="settlementType" placeholder="结算方式" clearable class="filter-item settlement-select">
          <el-option label="微信支付" value="wechat" />
          <el-option label="月结" value="monthly" />
        </el-select>
        <el-select v-model="settlementStatus" placeholder="结算状态" clearable class="filter-item settlement-status-select">
          <el-option v-for="(v, k) in settlementStatusMap" :key="k" :label="v" :value="k" />
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
        <el-select
          v-if="canFilterStaff"
          v-model="staffRole"
          placeholder="人员类型"
          clearable
          class="filter-item staff-role"
          @change="handleStaffRoleChange"
        >
          <el-option v-for="item in staffRoleOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select
          v-if="canFilterStaff"
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
        <el-button type="warning" @click="showBatchDialog">批量派配送员 ({{ selectedOrders.length }} 单)</el-button>
      </div>
      <el-table :data="orders" v-loading="loading" stripe @selection-change="onSelectionChange" ref="orderTable">
        <el-table-column v-if="canDispatch" type="selection" width="40" :selectable="isSelectable" />
        <el-table-column prop="orderNo" label="订单编号" width="200" />
        <el-table-column prop="merchant.realName" label="商户账号" width="110" />
        <el-table-column label="结算商户" width="140">
          <template #default="{ row }">{{ row.settlementMerchantName || row.merchant?.realName || '-' }}</template>
        </el-table-column>
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
        <el-table-column prop="settlementType" label="结算方式" width="100">
          <template #default="{ row }">
            <el-tag :type="row.settlementType === 'monthly' ? 'warning' : 'success'">
              {{ settlementTypeMap[row.settlementType] || row.settlementType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="settlementStatus" label="结算状态" width="120">
          <template #default="{ row }">
            {{ settlementStatusMap[row.settlementStatus] || row.settlementStatus }}
          </template>
        </el-table-column>
        <el-table-column label="支付状态" width="100">
          <template #default="{ row }">{{ paymentStatusText(row) }}</template>
        </el-table-column>
        <el-table-column v-if="showStaffColumns" prop="delivery.realName" label="配送员" width="100" />
        <el-table-column prop="createdAt" label="下单时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/orders/${row.id}`)">详情</el-button>
            <el-button v-if="canEditSettlementMerchant" type="primary" link @click="showSettlementMerchantDialog(row)">编辑结算商户</el-button>
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

    <el-dialog v-model="batchVisible" title="批量派配送员" width="450px">
      <el-form label-width="80px">
        <el-form-item label="已选">已选择 {{ selectedOrders.length }} 个订单</el-form-item>
        <el-form-item label="配送员">
          <el-select v-model="batchDeliveryId" placeholder="选择配送员" style="width:100%">
            <el-option v-for="d in deliverys" :key="d.id" :label="d.realName" :value="d.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!batchDeliveryId" @click="handleBatchDispatch">确认派单</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="settlementMerchantDialogVisible" title="编辑结算商户" width="460px">
      <el-form label-width="100px">
        <el-form-item label="订单号">{{ currentOrder?.orderNo }}</el-form-item>
        <el-form-item label="商户账号">{{ currentOrder?.merchant?.realName || '-' }}</el-form-item>
        <el-form-item label="结算商户">
          <el-input
            v-model="settlementMerchantFormName"
            maxlength="100"
            show-word-limit
            placeholder="请输入结算商户名称"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settlementMerchantDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="settlementMerchantSaving" @click="handleSaveSettlementMerchant">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { orderApi, downloadApi, userApi } from '@/api/index'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/access'

const userStore = useUserStore()
const loading = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const settlementMerchantName = ref('')
const filterStatus = ref('')
const settlementType = ref('')
const settlementStatus = ref('')
const dateRange = ref<[string, string] | null>(null)
const staffRole = ref('')
const staffId = ref<number | null>(null)
const staffOptions = ref<any[]>([])
const staffLoading = ref(false)
const role = computed(() => userStore.role)
const canDispatch = computed(() => ['boss', 'admin'].includes(role.value) && hasPermission('order:dispatch'))
const canExport = computed(() => ['boss', 'admin'].includes(role.value) && hasPermission('export:manage'))
const canEditSettlementMerchant = computed(() => ['boss', 'admin'].includes(role.value) && hasPermission('order:manage'))
const showStaffColumns = computed(() => ['boss', 'admin'].includes(role.value))
const canFilterStaff = computed(() => ['boss', 'admin'].includes(role.value))
const staffRoleOptions = computed(() => {
  if (['boss', 'admin'].includes(role.value)) {
    return [
      { label: '商户', value: 'merchant' },
      { label: '配送员', value: 'delivery' },
    ]
  }
  return []
})

const statusMap: Record<string, string> = {
  pending: '待支付', accepted: '待配送',
  made: '待配送', delivering: '配送中', delivered: '已送达', completed: '已完成', cancelled: '已取消',
}
const settlementTypeMap: Record<string, string> = {
  wechat: '微信支付',
  monthly: '月结',
}
const settlementStatusMap: Record<string, string> = {
  unpaid: '未支付',
  paid: '已支付',
  monthly_pending: '月结待结算',
  monthly_settled: '月结已结算',
  refunding: '退款中',
  refunded: '已退款',
}
const paymentStatusMap: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  refunding: '退款中',
  refunded: '已退款',
  failed: '支付失败',
}

function statusTagType(status: string) {
  const map: Record<string, string> = { pending: 'warning', accepted: 'info', made: '', delivering: '', delivered: 'success', completed: 'success', cancelled: 'danger' }
  return map[status] || ''
}

function paymentStatusText(row: any) {
  if (row.settlementType === 'monthly') return '-'
  const status = row.payment?.status
  return status ? paymentStatusMap[status] || status : '未创建'
}

function buildQueryParams() {
  const params: any = {}
  if (keyword.value.trim()) params.keyword = keyword.value.trim()
  if (settlementMerchantName.value.trim()) params.settlementMerchantName = settlementMerchantName.value.trim()
  if (filterStatus.value) params.status = filterStatus.value
  if (settlementType.value) params.settlementType = settlementType.value
  if (settlementStatus.value) params.settlementStatus = settlementStatus.value
  if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
  if (dateRange.value?.[1]) params.endDate = dateRange.value[1]
  if (canFilterStaff.value && staffRole.value && staffId.value) {
    const keyMap: Record<string, string> = {
      merchant: 'merchantId',
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
  settlementMerchantName.value = ''
  filterStatus.value = ''
  settlementType.value = ''
  settlementStatus.value = ''
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
  if (!staffRoleOptions.value.some((item) => item.value === staffRole.value)) {
    staffRole.value = ''
    return
  }
  staffLoading.value = true
  try {
    if (staffRole.value === 'merchant') {
      const data = await userApi.merchants({ pageSize: 500 })
      staffOptions.value = data.list || []
    } else {
      const data = await userApi.list({ role: staffRole.value, pageSize: 500 })
      staffOptions.value = data.list || []
    }
  } finally {
    staffLoading.value = false
  }
}

async function handleExport() {
  if (!canExport.value) return
  const params = buildQueryParams()
  await downloadApi.orders(params)
  ElMessage.success('导出成功')
}

const selectedOrders = ref<any[]>([])
const batchVisible = ref(false)
const batchDeliveryId = ref<number | null>(null)
const deliverys = ref<any[]>([])
const settlementMerchantDialogVisible = ref(false)
const settlementMerchantSaving = ref(false)
const settlementMerchantFormName = ref('')
const currentOrder = ref<any | null>(null)

function isSelectable(row: any) { return canDispatch.value && ['accepted', 'made'].includes(row.status) }
function onSelectionChange(val: any[]) { selectedOrders.value = val }

async function showBatchDialog() {
  if (!canDispatch.value) return
  deliverys.value = await userApi.dispatchStaff('delivery')
  batchVisible.value = true
}

async function handleBatchDispatch() {
  if (!batchDeliveryId.value) return
  const orderIds = selectedOrders.value.map(o => o.id)
  await orderApi.batchDispatch(orderIds, batchDeliveryId.value)
  ElMessage.success('批量派单完成')
  batchVisible.value = false
  selectedOrders.value = []
  fetchOrders()
}

function showSettlementMerchantDialog(row: any) {
  currentOrder.value = row
  settlementMerchantFormName.value = row.settlementMerchantName || row.merchant?.realName || ''
  settlementMerchantDialogVisible.value = true
}

async function handleSaveSettlementMerchant() {
  if (!currentOrder.value) return
  const name = settlementMerchantFormName.value.trim()
  if (!name) {
    ElMessage.warning('请输入结算商户名称')
    return
  }
  settlementMerchantSaving.value = true
  try {
    const updated = await orderApi.updateSettlementMerchantName(currentOrder.value.id, name)
    const index = orders.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) orders.value[index] = updated
    settlementMerchantDialogVisible.value = false
    ElMessage.success('结算商户已更新')
  } finally {
    settlementMerchantSaving.value = false
  }
}

onMounted(fetchOrders)
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.filter-item { flex-shrink: 0; }
.keyword-input { width: 180px; }
.settlement-merchant-input { width: 180px; }
.status-select { width: 130px; }
.settlement-select { width: 120px; }
.settlement-status-select { width: 150px; }
.date-range { width: 260px; }
.staff-role { width: 120px; }
.staff-select { width: 210px; }
</style>

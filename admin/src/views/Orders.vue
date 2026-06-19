<template>
  <div class="orders-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>订单管理</span>
        </div>
      </template>
      <div v-show="!isMobile" class="filter-bar">
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
      <div v-if="isMobile" class="mobile-filter-bar">
        <el-input
          v-model="keyword"
          placeholder="订单号"
          clearable
          class="mobile-filter-keyword"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="filterStatus" placeholder="状态" clearable class="mobile-filter-status" @change="handleSearch">
          <el-option v-for="(v, k) in statusMap" :key="k" :label="v" :value="k" />
        </el-select>
        <el-button type="primary" class="mobile-filter-button" @click="handleSearch">查询</el-button>
        <el-button class="mobile-filter-button" @click="handleReset">重置</el-button>
        <el-button
          v-if="hasMobileAdvancedFilters"
          class="mobile-filter-more"
          @click="mobileFilterVisible = true"
        >
          更多筛选<span v-if="mobileAdvancedFilterCount > 0">({{ mobileAdvancedFilterCount }})</span>
        </el-button>
      </div>
      <div style="margin-bottom: 12px;" v-if="canDispatch && selectedOrders.length > 0">
        <el-button type="warning" @click="showBatchDialog">批量派配送员 ({{ selectedOrders.length }} 单)</el-button>
      </div>
      <el-table
        v-show="!isMobile"
        :data="orders"
        v-loading="loading"
        stripe
        @selection-change="onSelectionChange"
        ref="orderTable"
        class="orders-table"
      >
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
            <el-button type="primary" link @click="goDetail(row.id)">详情</el-button>
            <el-button v-if="canEditSettlementMerchant" type="primary" link @click="showSettlementMerchantDialog(row)">编辑结算商户</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="isMobile" v-loading="loading" class="mobile-order-list">
        <div v-if="orders.length === 0" class="mobile-empty">暂无订单</div>
        <article v-for="row in orders" :key="row.id" class="mobile-order-card" @click="goDetail(row.id)">
          <div class="mobile-card-head">
            <div class="mobile-card-no">
              <strong>{{ row.orderNo }}</strong>
              <span>{{ new Date(row.createdAt).toLocaleString() }}</span>
            </div>
            <el-tag :type="statusTagType(row.status)">{{ statusMap[row.status] }}</el-tag>
          </div>
          <div class="mobile-card-grid">
            <div class="mobile-meta-item">
              <label>商品</label>
              <span>{{ orderItemsText(row) }}</span>
            </div>
            <div class="mobile-meta-item">
              <label>金额</label>
              <span>¥{{ Number(row.totalAmount).toFixed(2) }}</span>
            </div>
            <div class="mobile-meta-item">
              <label>商户账号</label>
              <span>{{ row.merchant?.realName || '-' }}</span>
            </div>
            <div class="mobile-meta-item">
              <label>配送员</label>
              <span>{{ row.delivery?.realName || '-' }}</span>
            </div>
            <div class="mobile-meta-item">
              <label>结算商户</label>
              <span>{{ row.settlementMerchantName || row.merchant?.realName || '-' }}</span>
            </div>
            <div class="mobile-meta-item">
              <label>支付/结算</label>
              <span>{{ row.settlementType === 'monthly' ? (settlementStatusMap[row.settlementStatus] || row.settlementStatus) : paymentStatusText(row) }}</span>
            </div>
          </div>
          <div class="mobile-card-actions" @click.stop>
            <el-button type="primary" plain @click="goDetail(row.id)">详情</el-button>
            <el-button
              v-if="canStartDelivery(row)"
              type="primary"
              @click="handleRowDeliveryStart(row)"
            >
              开始配送
            </el-button>
            <el-button
              v-if="canCompleteDelivery(row)"
              type="success"
              @click="handleRowDeliveryComplete(row)"
            >
              配送完成
            </el-button>
            <el-button
              v-if="canEditSettlementMerchant"
              type="primary"
              plain
              @click="showSettlementMerchantDialog(row)"
            >
              编辑结算商户
            </el-button>
            <el-button
              v-if="canMobileDispatch(row)"
              type="warning"
              plain
              @click="showSingleDispatchDialog(row)"
            >
              派单
            </el-button>
          </div>
        </article>
      </div>
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

    <el-dialog v-model="singleDispatchVisible" title="派单给配送员" width="420px">
      <el-form label-width="80px">
        <el-form-item label="订单号">{{ currentDispatchOrder?.orderNo || '-' }}</el-form-item>
        <el-form-item label="配送员">
          <el-select v-model="singleDeliveryId" placeholder="选择配送员" style="width:100%">
            <el-option v-for="d in singleDeliveryOptions" :key="d.id" :label="d.realName" :value="d.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="singleDispatchVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!singleDeliveryId" @click="handleSingleDispatch">确认派单</el-button>
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

    <el-drawer
      v-model="mobileFilterVisible"
      title="更多筛选"
      direction="btt"
      size="82%"
      class="mobile-filter-drawer"
    >
      <div class="mobile-drawer-form">
        <el-input
          v-model="settlementMerchantName"
          placeholder="结算商户"
          clearable
          class="mobile-drawer-control"
        />
        <el-select v-model="settlementType" placeholder="结算方式" clearable class="mobile-drawer-control">
          <el-option label="微信支付" value="wechat" />
          <el-option label="月结" value="monthly" />
        </el-select>
        <el-select v-model="settlementStatus" placeholder="结算状态" clearable class="mobile-drawer-control">
          <el-option v-for="(v, k) in settlementStatusMap" :key="k" :label="v" :value="k" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          class="mobile-drawer-control mobile-date-range"
        />
        <template v-if="canFilterStaff">
          <el-select
            v-model="staffRole"
            placeholder="人员类型"
            clearable
            class="mobile-drawer-control"
            @change="handleStaffRoleChange"
          >
            <el-option v-for="item in staffRoleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select
            v-model="staffId"
            placeholder="选择人员"
            clearable
            filterable
            :disabled="!staffRole"
            :loading="staffLoading"
            class="mobile-drawer-control"
          >
            <el-option
              v-for="item in staffOptions"
              :key="item.id"
              :label="item.phone ? `${item.realName} (${item.phone})` : item.realName"
              :value="item.id"
            />
          </el-select>
        </template>
      </div>
      <template #footer>
        <div class="mobile-drawer-actions">
          <el-button @click="handleReset">重置</el-button>
          <el-button v-if="canExport" type="success" @click="handleMobileExport">导出Excel</el-button>
          <el-button type="primary" @click="handleMobileAdvancedSearch">应用筛选</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { orderApi, downloadApi, userApi } from '@/api/index'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/access'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const isMobile = ref(false)
const mobileFilterVisible = ref(false)
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
const canDispatch = computed(() => hasPermission('order:dispatch'))
const canExport = computed(() => hasPermission('export:manage'))
const canEditSettlementMerchant = computed(() => hasPermission('order:manage'))
const showStaffColumns = computed(() => hasPermission('order:manage') || hasPermission('order:dispatch'))
const canFilterStaff = computed(() => hasPermission('user:manage'))
const hasMobileAdvancedFilters = computed(() => hasPermission('order:manage') || hasPermission('order:dispatch'))
const mobileAdvancedFilterCount = computed(() => {
  let count = 0
  if (settlementMerchantName.value.trim()) count += 1
  if (settlementType.value) count += 1
  if (settlementStatus.value) count += 1
  if (dateRange.value?.[0] || dateRange.value?.[1]) count += 1
  if (staffRole.value || staffId.value) count += 1
  return count
})
const staffRoleOptions = computed(() => {
  if (canFilterStaff.value) {
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

function syncViewport() {
  isMobile.value = window.innerWidth <= 768
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

function orderItemsText(row: any) {
  return (row.items || []).map((item: any) => `${item.product?.name || '-'} x${item.quantity}`).join(', ')
}

function canStartDelivery(row: any) {
  return role.value === 'delivery' && row.status === 'made'
}

function canCompleteDelivery(row: any) {
  return role.value === 'delivery' && row.status === 'delivering'
}

function canMobileDispatch(row: any) {
  return isMobile.value && canDispatch.value && ['accepted', 'made'].includes(row.status)
}

function goDetail(id: number) {
  router.push(`/orders/${id}`)
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

function handleMobileAdvancedSearch() {
  mobileFilterVisible.value = false
  handleSearch()
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

async function handleMobileExport() {
  mobileFilterVisible.value = false
  await handleExport()
}

const selectedOrders = ref<any[]>([])
const batchVisible = ref(false)
const batchDeliveryId = ref<number | null>(null)
const deliverys = ref<any[]>([])
const singleDispatchVisible = ref(false)
const currentDispatchOrder = ref<any | null>(null)
const singleDeliveryId = ref<number | null>(null)
const singleDeliveryOptions = ref<any[]>([])
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

async function showSingleDispatchDialog(row: any) {
  if (!canDispatch.value) return
  currentDispatchOrder.value = row
  singleDeliveryId.value = row.deliveryId || null
  singleDeliveryOptions.value = await userApi.dispatchStaff('delivery')
  singleDispatchVisible.value = true
}

async function handleSingleDispatch() {
  if (!currentDispatchOrder.value || !singleDeliveryId.value) return
  await orderApi.dispatchToDelivery(currentDispatchOrder.value.id, singleDeliveryId.value)
  ElMessage.success('已派单给配送员')
  singleDispatchVisible.value = false
  currentDispatchOrder.value = null
  singleDeliveryId.value = null
  fetchOrders()
}

async function handleRowDeliveryStart(row: any) {
  await orderApi.deliveryStart(row.id)
  ElMessage.success('已开始配送')
  fetchOrders()
}

async function handleRowDeliveryComplete(row: any) {
  await ElMessageBox.confirm('确认该订单已经配送完成?', '提示', { type: 'warning' })
  await orderApi.deliveryComplete(row.id)
  ElMessage.success('配送完成')
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

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  fetchOrders()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})
</script>

<style scoped>
.orders-page {
  min-width: 0;
}
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
.mobile-order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mobile-order-card {
  border: 1px solid #e6ebf2;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}
.mobile-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.mobile-card-no {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mobile-card-no strong {
  color: #1f2937;
  font-size: 14px;
  line-height: 1.35;
  word-break: break-all;
}
.mobile-card-no span {
  color: #6b7280;
  font-size: 12px;
}
.mobile-card-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.mobile-meta-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mobile-meta-item label {
  color: #6b7280;
  font-size: 12px;
}
.mobile-meta-item span {
  color: #1f2937;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}
.mobile-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.mobile-card-actions :deep(.el-button) {
  margin-left: 0;
}
.mobile-empty {
  padding: 28px 0;
  color: #6b7280;
  text-align: center;
}

@media (max-width: 768px) {
  .orders-page :deep(.el-card__body) {
    overflow-x: visible;
  }
  .mobile-card-grid {
    grid-template-columns: 1fr;
  }
  .filter-bar {
    display: none;
  }
  .mobile-filter-bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 104px;
    gap: 8px;
    margin-bottom: 12px;
  }
  .mobile-filter-keyword,
  .mobile-filter-status,
  .mobile-filter-more {
    width: 100%;
  }
  .mobile-filter-button {
    width: 100%;
    margin-left: 0;
  }
  .mobile-filter-more {
    grid-column: 1 / -1;
    margin-left: 0;
  }
  .mobile-card-actions :deep(.el-button) {
    min-height: 36px;
    flex: 1 1 calc(50% - 4px);
  }
}

.mobile-drawer-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mobile-drawer-control {
  width: 100%;
}
.mobile-date-range {
  max-width: 100%;
}
.mobile-drawer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.mobile-drawer-actions :deep(.el-button) {
  margin-left: 0;
}
</style>

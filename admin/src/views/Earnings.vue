<template>
  <div>
    <el-row :gutter="16" class="summary-row">
      <el-col :xs="12" :sm="8" :md="6">
        <el-card shadow="hover">
          <div class="summary-label">筛选收益合计</div>
          <div class="summary-value">¥{{ money(totalAmount) }}</div>
        </el-card>
      </el-col>
      <el-col v-for="item in byRole" :key="item.role" :xs="12" :sm="8" :md="6">
        <el-card shadow="hover">
          <div class="summary-label">{{ roleMap[item.role] || item.role }}</div>
          <div class="summary-value small">¥{{ money(item.total) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="toolbar">
          <span>员工收益总账</span>
          <div class="filters">
            <el-select v-model="filters.userId" placeholder="员工" clearable filterable style="width: 160px;">
              <el-option v-for="u in employees" :key="u.id" :label="`${u.realName} (${roleMap[u.role] || u.role})`" :value="u.id" />
            </el-select>
            <el-select v-model="filters.role" placeholder="角色" clearable style="width: 130px;">
              <el-option label="业务员" value="salesperson" />
              <el-option label="制作员" value="maker" />
              <el-option label="配送员" value="delivery" />
              <el-option label="推广员" value="promoter" />
            </el-select>
            <el-select v-model="filters.status" placeholder="收益状态" clearable style="width: 130px;">
              <el-option label="待结算" value="pending_settle" />
              <el-option label="已结算" value="settled" />
              <el-option label="已提现" value="withdrawn" />
            </el-select>
            <el-input v-model="filters.keyword" placeholder="订单号" clearable style="width: 170px;" @keyup.enter="fetchList" />
            <el-button type="primary" @click="fetchList">查询</el-button>
            <el-button type="success" @click="handleExport">导出Excel</el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" min-width="170" />
        <el-table-column label="员工" width="120">
          <template #default="{ row }">{{ row.user?.realName || '-' }}</template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="{ row }">{{ roleMap[row.role] || row.role }}</template>
        </el-table-column>
        <el-table-column label="手机号" width="130">
          <template #default="{ row }">{{ row.user?.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="订单金额" width="110">
          <template #default="{ row }">¥{{ money(row.order?.totalAmount || 0) }}</template>
        </el-table-column>
        <el-table-column label="收益金额" width="110">
          <template #default="{ row }">
            <span class="amount-positive">+¥{{ money(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="earningStatusType(row.status)">{{ earningStatusMap[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="产生时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { earningApi, downloadApi, userApi } from '@/api/index'

const loading = ref(false)
const list = ref<any[]>([])
const employees = ref<any[]>([])
const total = ref(0)
const totalAmount = ref(0)
const byRole = ref<any[]>([])
const page = ref(1)
const pageSize = 20
const filters = reactive({
  userId: null as number | null,
  role: '',
  status: '',
  keyword: '',
})

const roleMap: Record<string, string> = {
  salesperson: '业务员',
  maker: '制作员',
  delivery: '配送员',
  promoter: '推广员',
  boss: '老板',
  admin: '管理员',
}
const earningStatusMap: Record<string, string> = {
  pending_settle: '待结算',
  settled: '已结算',
  withdrawn: '已提现',
}

function money(value: any) {
  return Number(value || 0).toFixed(2)
}

function formatTime(value: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

function earningStatusType(status: string) {
  const map: Record<string, string> = { pending_settle: 'warning', settled: 'success', withdrawn: 'info' }
  return map[status] || ''
}

function buildParams() {
  const params: any = { page: page.value, pageSize }
  if (filters.userId) params.userId = filters.userId
  if (filters.role) params.role = filters.role
  if (filters.status) params.status = filters.status
  if (filters.keyword) params.keyword = filters.keyword
  return params
}

async function fetchEmployees() {
  employees.value = await userApi.earningOptions().catch(() => [])
}

async function fetchList() {
  loading.value = true
  try {
    const data = await earningApi.allEarnings(buildParams())
    list.value = data.list || []
    total.value = data.total || 0
    totalAmount.value = data.totalAmount || 0
    byRole.value = data.byRole || []
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  const params = buildParams()
  delete params.page
  delete params.pageSize
  await downloadApi.earnings(params)
  ElMessage.success('导出成功')
}

onMounted(() => {
  fetchEmployees()
  fetchList()
})
</script>

<style scoped>
.summary-row { margin-bottom: 16px; }
.summary-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.summary-value { font-size: 26px; font-weight: 700; color: #409EFF; }
.summary-value.small { font-size: 22px; color: #67C23A; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.pager { margin-top: 16px; text-align: right; }
.amount-positive { color: #67C23A; font-weight: 700; }
</style>

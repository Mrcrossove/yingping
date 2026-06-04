<template>
  <div>
    <el-row :gutter="16" class="summary-row">
      <el-col v-for="card in summaryCards" :key="card.label" :xs="12" :sm="12" :md="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">{{ card.label }}</div>
          <div class="summary-value" :style="{ color: card.color }">¥{{ money(card.value) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <el-card>
          <template #header>
            <div class="toolbar">
              <span>我的收益明细</span>
              <div class="filters">
                <el-select v-model="earningStatus" placeholder="收益状态" clearable style="width: 140px;">
                  <el-option label="待结算" value="pending_settle" />
                  <el-option label="已结算" value="settled" />
                  <el-option label="已提现" value="withdrawn" />
                </el-select>
                <el-input v-model="keyword" placeholder="搜索订单号" clearable style="width: 180px;" @keyup.enter="fetchEarnings" />
                <el-button type="primary" @click="fetchEarnings">查询</el-button>
              </div>
            </div>
          </template>

          <el-table :data="earnings" v-loading="earningsLoading" stripe>
            <el-table-column prop="orderNo" label="订单号" min-width="170" />
            <el-table-column label="角色" width="100">
              <template #default="{ row }">{{ roleMap[row.role] || row.role }}</template>
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
              v-model:current-page="earningPage"
              :page-size="pageSize"
              :total="earningTotal"
              layout="total, prev, pager, next"
              @current-change="fetchEarnings"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card class="side-card">
          <template #header>提现申请</template>
          <el-form :model="withdrawForm" label-width="80px">
            <el-form-item label="可提现">
              <strong>¥{{ money(summary.availableAmount) }}</strong>
            </el-form-item>
            <el-form-item label="金额">
              <el-input-number
                v-model="withdrawForm.amount"
                :min="0"
                :max="Number(summary.availableAmount || 0)"
                :precision="2"
                style="width: 100%;"
              />
            </el-form-item>
            <el-form-item label="账户类型">
              <el-select v-model="withdrawForm.accountType" style="width: 100%;">
                <el-option label="微信" value="wechat" />
                <el-option label="支付宝" value="alipay" />
                <el-option label="银行卡" value="bank" />
              </el-select>
            </el-form-item>
            <el-form-item label="账户信息">
              <el-input v-model="withdrawForm.accountInfo" placeholder="收款账号/姓名/备注" />
            </el-form-item>
            <el-button type="primary" :loading="submitting" :disabled="!canApply" style="width: 100%;" @click="handleApply">
              提交提现申请
            </el-button>
          </el-form>
        </el-card>

        <el-card class="side-card">
          <template #header>我的提现记录</template>
          <el-table :data="withdrawals" v-loading="withdrawalsLoading" stripe size="small">
            <el-table-column label="金额" width="90">
              <template #default="{ row }">¥{{ money(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="withdrawStatusType(row.status)" size="small">{{ withdrawStatusMap[row.status] || row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="时间" min-width="120">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { earningApi, withdrawalApi } from '@/api/index'

const pageSize = 20
const earningsLoading = ref(false)
const withdrawalsLoading = ref(false)
const submitting = ref(false)
const earnings = ref<any[]>([])
const withdrawals = ref<any[]>([])
const earningPage = ref(1)
const earningTotal = ref(0)
const earningStatus = ref('')
const keyword = ref('')
const summary = reactive({
  totalAmount: 0,
  pendingAmount: 0,
  withdrawnAmount: 0,
  paidAmount: 0,
  availableAmount: 0,
})
const withdrawForm = reactive({
  amount: 0,
  accountType: 'wechat',
  accountInfo: '',
})

const roleMap: Record<string, string> = {
  salesperson: '业务员',
  maker: '制作员',
  delivery: '配送员',
  promoter: '推广员',
}
const earningStatusMap: Record<string, string> = {
  pending_settle: '待结算',
  settled: '已结算',
  withdrawn: '已提现',
}
const withdrawStatusMap: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  paid: '已打款',
}

const summaryCards = computed(() => [
  { label: '累计收益', value: summary.totalAmount, color: '#409EFF' },
  { label: '待结算收益', value: summary.pendingAmount, color: '#E6A23C' },
  { label: '可提现金额', value: summary.availableAmount, color: '#67C23A' },
  { label: '已占用/已提现', value: summary.withdrawnAmount, color: '#909399' },
])
const canApply = computed(() =>
  Number(withdrawForm.amount || 0) > 0 &&
  Number(withdrawForm.amount || 0) <= Number(summary.availableAmount || 0) &&
  !!withdrawForm.accountType &&
  !!withdrawForm.accountInfo
)

function money(value: any) {
  return Number(value || 0).toFixed(2)
}

function formatTime(value: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString() : '-'
}

function earningStatusType(status: string) {
  const map: Record<string, string> = { pending_settle: 'warning', settled: 'success', withdrawn: 'info' }
  return map[status] || ''
}

function withdrawStatusType(status: string) {
  const map: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger', paid: 'info' }
  return map[status] || ''
}

async function fetchEarnings() {
  earningsLoading.value = true
  try {
    const params: any = { page: earningPage.value, pageSize }
    if (earningStatus.value) params.status = earningStatus.value
    if (keyword.value) params.keyword = keyword.value
    const data = await earningApi.myEarnings(params)
    earnings.value = data.list || []
    earningTotal.value = data.total || 0
    Object.assign(summary, {
      totalAmount: data.totalAmount || 0,
      pendingAmount: data.pendingAmount || 0,
      withdrawnAmount: data.withdrawnAmount || 0,
      paidAmount: data.paidAmount || 0,
      availableAmount: data.availableAmount || 0,
    })
  } finally {
    earningsLoading.value = false
  }
}

async function fetchWithdrawals() {
  withdrawalsLoading.value = true
  try {
    const data = await withdrawalApi.myWithdrawals({ pageSize: 50 })
    withdrawals.value = data.list || []
  } finally {
    withdrawalsLoading.value = false
  }
}

async function handleApply() {
  if (!canApply.value) {
    ElMessage.warning('请填写完整提现信息，且金额不能超过可提现金额')
    return
  }
  submitting.value = true
  try {
    await withdrawalApi.apply({
      amount: Number(withdrawForm.amount),
      accountType: withdrawForm.accountType,
      accountInfo: withdrawForm.accountInfo,
    })
    ElMessage.success('提现申请已提交')
    withdrawForm.amount = 0
    withdrawForm.accountInfo = ''
    await Promise.all([fetchEarnings(), fetchWithdrawals()])
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchEarnings()
  fetchWithdrawals()
})
</script>

<style scoped>
.summary-row { margin-bottom: 16px; }
.summary-card { margin-bottom: 12px; }
.summary-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.summary-value { font-size: 26px; font-weight: 700; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.filters { display: flex; align-items: center; gap: 10px; }
.pager { margin-top: 16px; text-align: right; }
.side-card { margin-bottom: 16px; }
.amount-positive { color: #67C23A; font-weight: 700; }
</style>

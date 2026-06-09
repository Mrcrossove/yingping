<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between;">
          <span>支付记录</span>
          <div>
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 120px; margin-right: 10px;">
              <el-option label="待支付" value="pending" />
              <el-option label="已支付" value="paid" />
              <el-option label="退款中" value="refunding" />
              <el-option label="已退款" value="refunded" />
            </el-select>
            <el-button type="primary" @click="fetchList">查询</el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="transactionId" label="交易号" width="200" />
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="paidAt" label="支付时间" width="170">
          <template #default="{ row }">{{ row.paidAt ? new Date(row.paidAt).toLocaleString() : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'paid'" type="danger" link @click="handleRefund(row.orderId)">退款</el-button>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 16px; text-align: right;">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchList" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { paymentApi } from '@/api/index'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')

const statusMap: Record<string, string> = { pending: '待支付', paid: '已支付', refunding: '退款中', refunded: '已退款', failed: '失败' }
function statusType(s: string) { const m: Record<string, string> = { pending: 'warning', paid: 'success', refunding: 'info', refunded: 'info', failed: 'danger' }; return m[s] || '' }

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const data = await request.get('/payments', params)
    list.value = data.list; total.value = data.total
  } finally { loading.value = false }
}

async function handleRefund(orderId: number) {
  await ElMessageBox.confirm('确认发起微信原路退款？退款提交后订单将同步取消，支付记录进入退款中。', '提示', { type: 'warning' })
  await paymentApi.refund(orderId)
  ElMessage.success('退款申请已提交')
  fetchList()
}

onMounted(fetchList)
</script>

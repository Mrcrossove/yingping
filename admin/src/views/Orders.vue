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
      <el-table :data="orders" v-loading="loading" stripe>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { orderApi, exportApi } from '@/api/index'

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

onMounted(fetchOrders)
</script>

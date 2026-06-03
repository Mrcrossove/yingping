<template>
  <div>
    <el-card>
      <template #header>
        <div class="toolbar">
          <span>商户看板</span>
          <div class="filters">
            <el-select v-model="filterBound" placeholder="推广绑定" clearable style="width: 130px;">
              <el-option label="已绑定" value="yes" />
              <el-option label="未绑定" value="no" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 120px;">
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
            <el-input v-model="keyword" placeholder="搜索姓名/手机/账号" clearable style="width: 220px;" />
          </div>
        </div>
      </template>

      <el-table :data="merchants" v-loading="loading" stripe>
        <el-table-column prop="username" label="微信账号" width="150" />
        <el-table-column label="商户名称" width="140">
          <template #default="{ row }">{{ row.merchantProfile?.shopName || row.realName }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="绑定推广员" width="160">
          <template #default="{ row }">
            <span v-if="row.promoter">{{ row.promoter.realName }}</span>
            <el-tag v-else type="info">未绑定</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="推广员手机" width="130">
          <template #default="{ row }">{{ row.promoter?.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="订单数" width="90">
          <template #default="{ row }">{{ row.orderCount }}</template>
        </el-table-column>
        <el-table-column label="累计金额" width="120">
          <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="最近下单" width="170">
          <template #default="{ row }">{{ row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleString() : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="fetchMerchants"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { userApi } from '@/api/index'

const loading = ref(false)
const merchants = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const filterBound = ref('')
const filterStatus = ref<number | ''>('')

async function fetchMerchants() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (filterBound.value) params.bound = filterBound.value
    if (filterStatus.value !== '') params.status = filterStatus.value
    const data = await userApi.merchantDashboard(params)
    merchants.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

watch([keyword, filterBound, filterStatus], () => {
  page.value = 1
  fetchMerchants()
})
onMounted(fetchMerchants)
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.filters { display: flex; align-items: center; gap: 10px; }
.pager { margin-top: 16px; text-align: right; }
</style>

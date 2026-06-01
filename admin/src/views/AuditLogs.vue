<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>操作日志</span>
          <div>
            <el-input v-model="keyword" placeholder="搜索操作" clearable style="width: 180px; margin-right: 10px;" @keyup.enter="fetchList" />
            <el-button type="primary" @click="fetchList">查询</el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe max-height="600">
        <el-table-column prop="username" label="操作人" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">{{ roleLabel(row.role) }}</template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="160" />
        <el-table-column prop="resource" label="资源" width="120" />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="140" />
        <el-table-column prop="createdAt" label="时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
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
import request from '@/utils/request'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')

function roleLabel(r: string) {
  const m: Record<string, string> = { boss: '老板', admin: '管理员', salesperson: '业务员', maker: '制作员', delivery: '配送员', promoter: '推广员', merchant: '商户' }
  return m[r] || r
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.action = keyword.value
    const data = await request.get('/audit-logs', params)
    list.value = data.list; total.value = data.total
  } finally { loading.value = false }
}

onMounted(fetchList)
</script>

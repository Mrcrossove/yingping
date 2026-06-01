<template>
  <div>
    <el-card>
      <template #header><span>商户注册审核</span></template>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="realName" label="商户名" width="120" />
        <el-table-column prop="username" label="账号" width="140" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="createdAt" label="注册时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="success" size="small" @click="handleApprove(row.id)">通过</el-button>
            <el-button type="danger" size="small" @click="handleReject(row.id)">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && list.length === 0" description="暂无待审核商户" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const list = ref<any[]>([])

async function fetchList() {
  loading.value = true
  try {
    const data = await request.get('/users/pending-merchants', { pageSize: 50 })
    list.value = data.list
  } finally { loading.value = false }
}

async function handleApprove(id: number) {
  await request.post(`/users/${id}/approve-merchant`)
  ElMessage.success('审核通过')
  fetchList()
}

async function handleReject(id: number) {
  await request.post(`/users/${id}/reject-merchant`)
  ElMessage.success('已拒绝')
  fetchList()
}

onMounted(fetchList)
</script>

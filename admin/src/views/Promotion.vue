<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>推广管理</span>
          <el-button v-if="isPromoter" type="primary" :loading="generating" @click="handleGenerateCode">生成推广码</el-button>
        </div>
      </template>
      <el-tabs>
        <el-tab-pane label="推广码">
          <el-table :data="codes.list" v-loading="codesLoading" stripe>
            <el-table-column prop="code" label="推广码" width="150" />
            <el-table-column prop="promoter.realName" label="推广员" width="150" />
            <el-table-column prop="promoter.phone" label="手机号" width="130" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '有效' : '已失效' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="170">
              <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="商户绑定">
          <el-table :data="bindings.list" v-loading="bindingsLoading" stripe>
            <el-table-column prop="merchant.realName" label="商户" width="150" />
            <el-table-column prop="merchant.phone" label="商户手机" width="130" />
            <el-table-column prop="promoter.realName" label="推广员" width="150" />
            <el-table-column prop="promoter.phone" label="推广员手机" width="130" />
            <el-table-column prop="createdAt" label="绑定时间" width="170">
              <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 16px; text-align: right;">
            <el-pagination v-model:current-page="bindingsPage" :page-size="20" :total="bindings.total" layout="total, prev, pager, next" @current-change="fetchBindings" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { promotionApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const codes = reactive({ list: [], total: 0 })
const bindings = reactive({ list: [], total: 0 })
const codesLoading = ref(false)
const bindingsLoading = ref(false)
const generating = ref(false)
const bindingsPage = ref(1)
const isPromoter = computed(() => userStore.role === 'promoter')

async function fetchCodes() {
  codesLoading.value = true
  try { const data = await promotionApi.codes({ pageSize: 100 }); codes.list = data.list; codes.total = data.total }
  finally { codesLoading.value = false }
}

async function fetchBindings() {
  bindingsLoading.value = true
  try { const data = await promotionApi.bindings({ page: bindingsPage.value, pageSize: 20 }); bindings.list = data.list; bindings.total = data.total }
  finally { bindingsLoading.value = false }
}

async function handleGenerateCode() {
  generating.value = true
  try {
    await promotionApi.generateCode()
    ElMessage.success('推广码生成成功')
    fetchCodes()
  } finally {
    generating.value = false
  }
}

onMounted(() => { fetchCodes(); fetchBindings() })
</script>

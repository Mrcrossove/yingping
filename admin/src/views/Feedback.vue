<template>
  <div class="feedback-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>反馈管理</span>
          <el-button @click="fetchFeedback">刷新</el-button>
        </div>
      </template>

      <div class="filter-bar">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索商户/手机号/标题/内容"
          clearable
          class="keyword-input"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="filters.category" placeholder="反馈分类" clearable class="filter-select">
          <el-option v-for="(label, value) in categoryMap" :key="value" :label="label" :value="value" />
        </el-select>
        <el-select v-model="filters.status" placeholder="处理状态" clearable class="filter-select">
          <el-option v-for="(label, value) in statusMap" :key="value" :label="label" :value="value" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="date-range"
        />
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <el-table :data="feedbacks" v-loading="loading" stripe>
        <el-table-column label="商户" min-width="180">
          <template #default="{ row }">
            <div class="merchant-cell">
              <strong>{{ row.merchant?.merchantProfile?.shopName || row.merchant?.realName || '-' }}</strong>
              <span>{{ row.merchant?.realName || '-' }} {{ row.merchant?.phone || '' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag>{{ categoryMap[row.category] || row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="反馈内容" min-width="260">
          <template #default="{ row }">
            <div class="content-cell">
              <strong>{{ row.title }}</strong>
              <span>{{ row.content }}</span>
              <small v-if="row.contactPhone">联系电话：{{ row.contactPhone }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusMap[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="后台回复" min-width="220">
          <template #default="{ row }">
            <span class="reply-text">{{ row.reply || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="处理时间" width="170">
          <template #default="{ row }">{{ row.processedAt ? formatTime(row.processedAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showHandleDialog(row)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="fetchFeedback"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="处理反馈" width="560px">
      <div v-if="currentFeedback" class="dialog-summary">
        <p><b>商户：</b>{{ currentFeedback.merchant?.merchantProfile?.shopName || currentFeedback.merchant?.realName || '-' }}</p>
        <p><b>标题：</b>{{ currentFeedback.title }}</p>
        <p><b>内容：</b>{{ currentFeedback.content }}</p>
      </div>
      <el-form label-width="90px">
        <el-form-item label="处理状态">
          <el-select v-model="handleForm.status" style="width: 100%">
            <el-option v-for="(label, value) in statusMap" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="回复商户">
          <el-input
            v-model="handleForm.reply"
            type="textarea"
            maxlength="2000"
            show-word-limit
            :rows="5"
            placeholder="填写处理说明，商户可在小程序端查看"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { feedbackApi } from '@/api/index'

const loading = ref(false)
const saving = ref(false)
const feedbacks = ref<any[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dateRange = ref<[string, string] | null>(null)
const dialogVisible = ref(false)
const currentFeedback = ref<any | null>(null)
const handleForm = ref({ status: 'processing', reply: '' })
const filters = ref({ keyword: '', category: '', status: '' })

const categoryMap: Record<string, string> = {
  suggestion: '经营建议',
  product: '商品建议',
  service: '配送服务',
  system: '系统问题',
  other: '其他',
}
const statusMap: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  rejected: '不采纳',
}

function buildParams() {
  const params: any = { page: page.value, pageSize: pageSize.value }
  if (filters.value.keyword.trim()) params.keyword = filters.value.keyword.trim()
  if (filters.value.category) params.category = filters.value.category
  if (filters.value.status) params.status = filters.value.status
  if (dateRange.value?.[0]) params.startDate = dateRange.value[0]
  if (dateRange.value?.[1]) params.endDate = dateRange.value[1]
  return params
}

async function fetchFeedback() {
  loading.value = true
  try {
    const data = await feedbackApi.list(buildParams())
    feedbacks.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  fetchFeedback()
}

function handleReset() {
  filters.value = { keyword: '', category: '', status: '' }
  dateRange.value = null
  page.value = 1
  fetchFeedback()
}

function showHandleDialog(row: any) {
  currentFeedback.value = row
  handleForm.value = { status: row.status || 'processing', reply: row.reply || '' }
  dialogVisible.value = true
}

async function handleSave() {
  if (!currentFeedback.value) return
  saving.value = true
  try {
    await feedbackApi.updateStatus(currentFeedback.value.id, handleForm.value)
    ElMessage.success('反馈处理结果已保存')
    dialogVisible.value = false
    fetchFeedback()
  } finally {
    saving.value = false
  }
}

function statusTagType(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    rejected: 'info',
  }
  return map[status] || ''
}

function formatTime(value: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

onMounted(fetchFeedback)
</script>

<style scoped>
.feedback-page { min-width: 0; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.keyword-input { width: 260px; }
.filter-select { width: 130px; }
.date-range { width: 260px; }
.merchant-cell,
.content-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.merchant-cell strong,
.content-cell strong {
  color: #1f2937;
  line-height: 1.35;
}
.merchant-cell span,
.content-cell span,
.reply-text {
  color: #5f6b63;
  line-height: 1.45;
  word-break: break-word;
}
.content-cell small { color: #8b5e28; }
.pagination-wrap { margin-top: 16px; text-align: right; }
.dialog-summary {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #f4f7f2;
  color: #344238;
}
.dialog-summary p {
  margin: 0 0 8px;
  line-height: 1.5;
}
.dialog-summary p:last-child { margin-bottom: 0; }

@media (max-width: 768px) {
  .filter-bar {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .keyword-input,
  .date-range {
    grid-column: 1 / -1;
    width: 100%;
  }
  .filter-select {
    width: 100%;
  }
  .filter-bar :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>

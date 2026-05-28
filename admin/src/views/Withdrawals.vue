<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between;">
          <span>提现审核</span>
          <div>
            <el-select v-model="filterStatus" placeholder="审核状态" clearable style="width: 130px; margin-right: 10px;">
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
            <el-button type="primary" @click="fetchList">查询</el-button>
            <el-button type="success" @click="handleExport" style="margin-left: 8px;">导出Excel</el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="user.realName" label="姓名" width="100" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">{{ roleMap[row.user?.role] || row.user?.role }}</template>
        </el-table-column>
        <el-table-column prop="user.phone" label="手机号" width="130" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="accountType" label="账户类型" width="100" />
        <el-table-column prop="accountInfo" label="账户信息" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" width="150" />
        <el-table-column prop="createdAt" label="申请时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" v-if="userStore.role === 'boss' || userStore.role === 'admin'">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="success" link @click="handleApprove(row.id)">通过</el-button>
              <el-button type="danger" link @click="showRejectDialog(row)">拒绝</el-button>
            </template>
            <span v-else style="color: #909399;">已处理</span>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 16px; text-align: right;">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchList" />
      </div>
    </el-card>

    <el-dialog v-model="rejectDialogVisible" title="拒绝提现" width="400px">
      <el-input v-model="rejectRemark" placeholder="请输入拒绝原因" type="textarea" :rows="3" />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { withdrawalApi, exportApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const rejectDialogVisible = ref(false)
const rejectRemark = ref('')
const currentRejectId = ref(0)

const statusMap: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }
const roleMap: Record<string, string> = { salesperson: '业务员', maker: '制作员', delivery: '配送员', promoter: '推广员' }
function statusType(s: string) { const m: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger' }; return m[s] || '' }

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const data = await withdrawalApi.allWithdrawals(params)
    list.value = data.list; total.value = data.total
  } finally { loading.value = false }
}

async function handleApprove(id: number) { await withdrawalApi.approve(id); ElMessage.success('审核通过'); fetchList() }

function showRejectDialog(row: any) { currentRejectId.value = row.id; rejectRemark.value = ''; rejectDialogVisible.value = true }

async function handleReject() {
  await withdrawalApi.reject(currentRejectId.value, rejectRemark.value)
  ElMessage.success('已拒绝'); rejectDialogVisible.value = false; fetchList()
}

function handleExport() { window.open(exportApi.withdrawals(), '_blank') }

onMounted(fetchList)
</script>

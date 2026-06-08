<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>推广管理</span>
          <el-button v-if="isPromoter" type="primary" :loading="generating" @click="handleGenerateCode">生成推广码</el-button>
        </div>
      </template>
      <el-row v-if="isPromoter" :gutter="16" style="margin-bottom: 16px;">
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-label">已绑定商家</div>
            <div class="stat-value">{{ summary.bindingCount }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-label">累计分成</div>
            <div class="stat-value">¥{{ summary.totalCommission.toFixed(2) }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-label">待结算</div>
            <div class="stat-value">¥{{ summary.pendingCommission.toFixed(2) }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-label">已结算/提现</div>
            <div class="stat-value">¥{{ summary.settledCommission.toFixed(2) }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card v-if="isPromoter" shadow="never" style="margin-bottom: 16px;">
        <template #header>我的推广码</template>
        <div v-if="myCode" class="code-panel">
          <div>
            <div class="code-text">{{ myCode.code }}</div>
            <div class="code-tip">客户扫码进入小程序并微信登录后，会自动绑定到你名下。</div>
          </div>
          <div class="qr-wrap">
            <img v-if="wxacode?.qrcode" :src="wxacode.qrcode" class="qr-img" />
            <el-empty v-else :description="wxacode?.message || '暂无小程序码'" :image-size="80" />
          </div>
        </div>
        <el-empty v-else description="暂无推广码，请先生成" />
      </el-card>

      <el-tabs>
        <el-tab-pane v-if="canManagePromotion" label="推广码">
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
        <el-tab-pane v-if="canManagePromotion" label="商户绑定">
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
        <el-tab-pane v-if="canManagePromotion" label="上传商家线索">
          <el-table :data="leads.list" v-loading="leadsLoading" stripe>
            <el-table-column prop="merchantName" label="商家名称" width="160" />
            <el-table-column prop="phone" label="联系电话" width="130" />
            <el-table-column prop="address" label="地址" min-width="180" />
            <el-table-column prop="remark" label="备注" min-width="160" />
            <el-table-column prop="promoter.realName" label="推广员" width="120" />
            <el-table-column prop="promoter.phone" label="推广员手机" width="130" />
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-select v-if="canManageLead" v-model="row.status" size="small" @change="(status: string) => handleLeadStatus(row.id, status)">
                  <el-option v-for="(label, key) in leadStatusMap" :key="key" :label="label" :value="key" />
                </el-select>
                <el-tag v-else>{{ leadStatusMap[row.status] || row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="提交时间" width="170">
              <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 16px; text-align: right;">
            <el-pagination v-model:current-page="leadsPage" :page-size="20" :total="leads.total" layout="total, prev, pager, next" @current-change="fetchLeads" />
          </div>
        </el-tab-pane>
        <el-tab-pane v-if="isPromoter" label="我的分成记录">
          <el-table :data="commission.list" v-loading="commissionLoading" stripe>
            <el-table-column prop="orderNo" label="订单号" width="180" />
            <el-table-column prop="merchantName" label="商家" width="160" />
            <el-table-column prop="amount" label="分成金额" width="120">
              <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">{{ earningStatusMap[row.status] || row.status }}</template>
            </el-table-column>
            <el-table-column prop="createdAt" label="产生时间" width="180">
              <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
            </el-table-column>
          </el-table>
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
const leads = reactive({ list: [], total: 0 })
const commission = reactive({ list: [], total: 0 })
const summary = reactive({ bindingCount: 0, totalCommission: 0, pendingCommission: 0, settledCommission: 0 })
const myCode = ref<any>(null)
const wxacode = ref<any>(null)
const codesLoading = ref(false)
const bindingsLoading = ref(false)
const leadsLoading = ref(false)
const commissionLoading = ref(false)
const generating = ref(false)
const bindingsPage = ref(1)
const leadsPage = ref(1)
const isPromoter = computed(() => userStore.role === 'promoter')
const canManagePromotion = computed(() => ['boss', 'admin'].includes(userStore.role))
const canManageLead = computed(() => ['boss', 'admin'].includes(userStore.role))
const leadStatusMap: Record<string, string> = {
  pending: '待跟进',
  followed: '已跟进',
  converted: '已转化',
  rejected: '已拒绝',
}
const earningStatusMap: Record<string, string> = {
  pending_settle: '待结算',
  settled: '已结算',
  withdrawn: '已提现',
}

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

async function fetchLeads() {
  leadsLoading.value = true
  try { const data = await promotionApi.merchantLeads({ page: leadsPage.value, pageSize: 20 }); leads.list = data.list; leads.total = data.total }
  finally { leadsLoading.value = false }
}

async function fetchPromoterHome() {
  if (!isPromoter.value) return
  const [code, stat] = await Promise.all([
    promotionApi.myCode().catch(() => null),
    promotionApi.summary().catch(() => null),
  ])
  myCode.value = code
  wxacode.value = null
  if (code) {
    wxacode.value = await promotionApi.wxacode().catch(() => ({
      code: code.code,
      qrcode: null,
      message: '小程序码生成失败，已显示文本推广码',
    }))
  }
  if (stat) Object.assign(summary, stat)
}

async function fetchCommission() {
  if (!isPromoter.value) return
  commissionLoading.value = true
  try {
    const data = await promotionApi.commissionDetails({ pageSize: 50 })
    commission.list = data.list
    commission.total = data.total
  } finally {
    commissionLoading.value = false
  }
}

async function handleLeadStatus(id: number, status: string) {
  await promotionApi.updateMerchantLeadStatus(id, status)
  ElMessage.success('状态已更新')
  fetchLeads()
}

async function handleGenerateCode() {
  generating.value = true
  try {
    await promotionApi.generateCode()
    ElMessage.success('推广码生成成功')
    if (canManagePromotion.value) fetchCodes()
    fetchPromoterHome()
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  if (canManagePromotion.value) {
    fetchCodes()
    fetchBindings()
    fetchLeads()
  }
  fetchPromoterHome()
  fetchCommission()
})
</script>

<style scoped>
.stat-label { color: #909399; font-size: 13px; margin-bottom: 6px; }
.stat-value { color: #303133; font-size: 24px; font-weight: 700; }
.code-panel { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.code-text { font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #1a73e8; }
.code-tip { color: #909399; margin-top: 8px; }
.qr-wrap { width: 180px; min-height: 180px; display: flex; align-items: center; justify-content: center; }
.qr-img { width: 180px; height: 180px; object-fit: contain; border: 1px solid #ebeef5; border-radius: 8px; }
</style>

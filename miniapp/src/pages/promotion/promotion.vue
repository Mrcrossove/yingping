<template>
  <view class="container">
    <!-- Tab 切换 -->
    <view class="tabs">
      <view v-for="t in tabs" :key="t.key" :class="['tab', { active: currentTab === t.key }]"
        @click="currentTab = t.key">{{ t.label }}</view>
    </view>

    <!-- Tab 1: 推广码 -->
    <view v-if="currentTab === 'code'">
      <view v-if="myCode" class="promo-card">
        <text class="promo-label">我的推广码</text>
        <text class="promo-code">{{ myCode.code }}</text>
        <image v-if="qrImage" :src="qrImage" class="qr-image" mode="aspectFit" />
        <view v-else class="qr-box">
          <text class="qr-placeholder">加载中...</text>
        </view>
        <text class="promo-tip">让商户扫码或在注册时输入此推广码即可绑定</text>
      </view>
      <view v-else class="generate-section">
        <button @click="handleGenerate" class="gen-btn">生成推广码</button>
      </view>
    </view>

    <!-- Tab 2: 分润记录 -->
    <view v-if="currentTab === 'records'">
      <view class="section-title">分润记录</view>
      <view v-for="r in commissionItems" :key="r.id" class="record-item">
        <view class="ri-left">
          <text class="ri-merchant">{{ r.merchantName }}</text>
          <text class="ri-order">{{ r.orderNo }}</text>
          <text class="ri-date">{{ formatDate(r.createdAt) }}</text>
        </view>
        <view class="ri-right">
          <text class="ri-amount">+¥{{ Number(r.amount).toFixed(2) }}</text>
          <text class="ri-status">{{ earningStatusMap[r.status] || r.status }}</text>
        </view>
      </view>
      <view v-if="commissionItems.length === 0" class="empty">暂无分润记录</view>
    </view>

    <!-- Tab 3: 上传商家 -->
    <view v-if="currentTab === 'upload'">
      <view class="form-card">
        <text class="form-title">上传商家信息</text>
        <input v-model="merchantForm.name" placeholder="商家名称" class="form-input" />
        <input v-model="merchantForm.phone" placeholder="商家电话" class="form-input" />
        <input v-model="merchantForm.address" placeholder="商家地址" class="form-input" />
        <textarea v-model="merchantForm.remark" placeholder="备注 (选填)" class="form-textarea" />
        <button class="submit-btn" :disabled="submittingLead" @click="handleUpload">{{ submittingLead ? '提交中...' : '提交' }}</button>
      </view>
      <view class="form-card lead-list">
        <text class="form-title">已上传商家</text>
        <view v-for="lead in merchantLeads" :key="lead.id" class="lead-item">
          <view>
            <text class="lead-name">{{ lead.merchantName }}</text>
            <text class="lead-meta">{{ lead.phone }} {{ lead.address || '' }}</text>
          </view>
          <text class="lead-status">{{ leadStatusMap[lead.status] || lead.status }}</text>
        </view>
        <view v-if="merchantLeads.length === 0" class="empty small">暂无上传记录</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { promotionApi } from '@/api/index'

const currentTab = ref('code')
const myCode = ref<any>(null)
const qrImage = ref('')
const commissionItems = ref<any[]>([])
const merchantLeads = ref<any[]>([])
const submittingLead = ref(false)
const merchantForm = reactive({ name: '', phone: '', address: '', remark: '' })

const tabs = [
  { key: 'code', label: '推广码' },
  { key: 'records', label: '分润记录' },
  { key: 'upload', label: '上传商家' },
]

const earningStatusMap: Record<string, string> = {
  pending_settle: '待结算',
  settled: '已结算',
  withdrawn: '已提现',
}

const leadStatusMap: Record<string, string> = {
  pending: '待跟进',
  followed: '已跟进',
  converted: '已转化',
  rejected: '已拒绝',
}

async function fetchCode() {
  try {
    myCode.value = await promotionApi.myCode()
    const qrData = await promotionApi.wxacode()
    if (qrData?.qrcode) qrImage.value = qrData.qrcode
  } catch { myCode.value = null }
}

async function fetchCommissionDetails() {
  try {
    const data = await promotionApi.commissionDetails({ pageSize: 50 })
    commissionItems.value = data.list || []
  } catch {
    commissionItems.value = []
  }
}

async function fetchMerchantLeads() {
  try {
    const data = await promotionApi.myMerchantLeads({ pageSize: 50 })
    merchantLeads.value = data.list || []
  } catch {
    merchantLeads.value = []
  }
}

async function handleGenerate() {
  myCode.value = await promotionApi.generateCode()
  uni.showToast({ title: '推广码已生成', icon: 'success' })
}

async function handleUpload() {
  if (!merchantForm.name || !merchantForm.phone) {
    uni.showToast({ title: '请填写商家名称和电话', icon: 'none' })
    return
  }
  submittingLead.value = true
  try {
    await promotionApi.uploadMerchant({
      name: merchantForm.name,
      phone: merchantForm.phone,
      address: merchantForm.address,
      remark: merchantForm.remark,
    })
    uni.showToast({ title: '商家信息已提交', icon: 'success' })
    merchantForm.name = ''
    merchantForm.phone = ''
    merchantForm.address = ''
    merchantForm.remark = ''
    fetchMerchantLeads()
  } finally {
    submittingLead.value = false
  }
}

function formatDate(value: string) {
  if (!value) return ''
  return value.slice(0, 10)
}

onShow(() => {
  fetchCode()
  fetchCommissionDetails()
  fetchMerchantLeads()
})
</script>

<style scoped>
.container { padding: 10px; }
.tabs { display: flex; background: #fff; border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
.tab { flex: 1; text-align: center; padding: 12px; font-size: 14px; color: #666; }
.tab.active { color: #1a73e8; font-weight: 700; border-bottom: 2px solid #1a73e8; }
.promo-card { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 24px; text-align: center; color: #fff; }
.promo-label { font-size: 13px; opacity: 0.8; }
.promo-code { font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 10px 0; display: block; }
.qr-box { width: 120px; height: 120px; background: #fff; border-radius: 12px; margin: 12px auto; display: flex; align-items: center; justify-content: center; }
.qr-placeholder { color: #999; font-size: 14px; }
.promo-tip { font-size: 11px; opacity: 0.7; }
.generate-section { text-align: center; margin-top: 60px; }
.gen-btn { background: #409EFF; color: #fff; border: none; border-radius: 8px; padding: 14px 40px; font-size: 16px; }
.section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
.record-item { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 8px; display: flex; justify-content: space-between; }
.ri-left { display: flex; flex-direction: column; }
.ri-merchant { font-size: 14px; font-weight: 600; }
.ri-order { font-size: 12px; color: #999; }
.ri-date { font-size: 11px; color: #ccc; }
.ri-right { text-align: right; }
.ri-amount { font-size: 16px; font-weight: bold; color: #67C23A; }
.ri-status { font-size: 11px; color: #999; }
.form-card { background: #fff; border-radius: 12px; padding: 20px; }
.form-title { font-size: 16px; font-weight: bold; display: block; margin-bottom: 12px; }
.form-input { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 14px; }
.form-textarea { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 14px; min-height: 72px; width: 100%; box-sizing: border-box; }
.submit-btn { background: #409EFF; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 16px; }
.submit-btn[disabled] { opacity: 0.6; }
.lead-list { margin-top: 10px; }
.lead-item { display: flex; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f4f4f4; }
.lead-name { display: block; font-size: 14px; font-weight: 600; color: #333; }
.lead-meta { display: block; font-size: 12px; color: #999; margin-top: 4px; }
.lead-status { font-size: 12px; color: #409EFF; white-space: nowrap; }
.empty { text-align: center; padding: 40px; color: #999; }
.empty.small { padding: 20px; font-size: 13px; }
</style>

<template>
  <view class="container">
    <view class="form-card">
      <text class="form-title">申请提现</text>
      <input v-model="form.amount" type="digit" placeholder="提现金额" class="form-input" />
      <view class="picker-wrap" @click="showAccountTypes">
        <text>{{ form.accountType || '选择账户类型' }}</text>
        <text class="arrow">></text>
      </view>
      <input v-model="form.accountInfo" placeholder="账户信息(账号/卡号/手机号)" class="form-input" />
      <button class="submit-btn" @click="handleApply">提交申请</button>
    </view>

    <view class="record-title">提现记录</view>
    <view v-for="w in withdrawals" :key="w.id" class="withdraw-item">
      <view class="wd-left">
        <text class="wd-amount">-¥{{ Number(w.amount).toFixed(2) }}</text>
        <text class="wd-info">{{ w.accountType }}: {{ w.accountInfo }}</text>
      </view>
      <text :class="['wd-status', 'ws-' + w.status]">{{ statusMap[w.status] }}</text>
    </view>
    <view v-if="withdrawals.length === 0" class="empty">
      <text>暂无提现记录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onShow } from 'vue'
import { withdrawalApi } from '@/api/index'

const form = ref({ amount: '', accountType: '', accountInfo: '' })
const withdrawals = ref<any[]>([])

const statusMap: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }

function showAccountTypes() {
  uni.showActionSheet({
    itemList: ['微信零钱', '银行卡', '支付宝'],
    success: (res: any) => {
      const types = ['微信零钱', '银行卡', '支付宝']
      form.value.accountType = types[res.tapIndex]
    },
  })
}

async function handleApply() {
  if (!form.value.amount || !form.value.accountType || !form.value.accountInfo) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  try {
    await withdrawalApi.apply({ amount: +form.value.amount, accountType: form.value.accountType, accountInfo: form.value.accountInfo })
    uni.showToast({ title: '提现申请已提交', icon: 'success' })
    form.value = { amount: '', accountType: '', accountInfo: '' }
    fetchWithdrawals()
  } catch { }
}

async function fetchWithdrawals() {
  const data = await withdrawalApi.myWithdrawals({ pageSize: 50 })
  withdrawals.value = data.list
}

onShow(fetchWithdrawals)
</script>

<style scoped>
.container { padding: 10px; }
.form-card { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
.form-title { font-size: 16px; font-weight: bold; display: block; margin-bottom: 12px; }
.form-input { border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 14px; }
.picker-wrap { display: flex; justify-content: space-between; padding: 10px 12px; margin-bottom: 12px; border: 1px solid #eee; border-radius: 8px; font-size: 14px; }
.arrow { color: #ccc; }
.submit-btn { background: #409EFF; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 16px; }
.record-title { font-size: 15px; font-weight: bold; margin-bottom: 8px; }
.withdraw-item { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
.wd-left { display: flex; flex-direction: column; }
.wd-amount { font-size: 16px; font-weight: bold; color: #f56c6c; }
.wd-info { font-size: 12px; color: #999; margin-top: 4px; }
.wd-status { font-size: 13px; }
.ws-pending { color: #e6a23c; }
.ws-approved { color: #67C23A; }
.ws-rejected { color: #f56c6c; }
.empty { text-align: center; padding: 60px 0; color: #999; }
</style>

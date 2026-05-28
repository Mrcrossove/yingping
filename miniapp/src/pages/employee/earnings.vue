<template>
  <view class="container">
    <view class="summary">
      <view class="summary-item">
        <text class="summary-label">待结算</text>
        <text class="summary-value">¥{{ earningsData.pendingAmount || 0 }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">已提现</text>
        <text class="summary-value">¥{{ earningsData.withdrawnAmount || 0 }}</text>
      </view>
    </view>

    <view class="list-title">收益明细</view>
    <view v-for="e in earningsData.list" :key="e.id" class="earning-item">
      <view class="earning-left">
        <text class="earning-order">{{ e.orderNo }}</text>
        <text class="earning-time">{{ e.createdAt }}</text>
      </view>
      <view class="earning-right">
        <text class="earning-amount">+¥{{ Number(e.amount).toFixed(2) }}</text>
        <text :class="['earning-status', 'status-' + e.status]">{{ statusMap[e.status] || e.status }}</text>
      </view>
    </view>
    <view v-if="!earningsData.list || earningsData.list.length === 0" class="empty">
      <text>暂无收益</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onShow } from 'vue'
import { earningApi } from '@/api/index'

const earningsData = ref<any>({ list: [], pendingAmount: 0, withdrawnAmount: 0 })

const statusMap: Record<string, string> = { pending_settle: '待结算', settled: '已结算', withdrawn: '已提现' }

async function fetchEarnings() {
  earningsData.value = await earningApi.myEarnings({ pageSize: 50 })
}

onShow(fetchEarnings)
</script>

<style scoped>
.container { padding: 10px; }
.summary { display: flex; gap: 10px; margin-bottom: 16px; }
.summary-item { flex: 1; background: #fff; border-radius: 10px; padding: 16px; text-align: center; }
.summary-label { font-size: 13px; color: #999; }
.summary-value { font-size: 22px; font-weight: bold; color: #409EFF; display: block; margin-top: 4px; }
.list-title { font-size: 15px; font-weight: bold; margin-bottom: 8px; }
.earning-item { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; }
.earning-left { display: flex; flex-direction: column; }
.earning-order { font-size: 14px; }
.earning-time { font-size: 11px; color: #999; margin-top: 4px; }
.earning-right { text-align: right; }
.earning-amount { font-size: 16px; font-weight: bold; color: #67C23A; }
.earning-status { font-size: 11px; display: block; margin-top: 4px; }
.status-pending_settle { color: #e6a23c; }
.status-settled { color: #409EFF; }
.status-withdrawn { color: #999; }
.empty { text-align: center; padding: 60px 0; color: #999; }
</style>

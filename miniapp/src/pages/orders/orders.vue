<template>
  <view class="page">
    <!-- 统计卡片 row -->
    <view class="stats-row" v-if="appStore.currentRole !== 'merchant'">
      <view v-for="s in stats" :key="s.label" class="stat-card" :style="{ borderTopColor: s.color }"
        @click="filterStatus = filterStatus === s.status ? '' : s.status">
        <text class="stat-num" :style="{ color: s.color }">{{ s.count }}</text>
        <text class="stat-label">{{ s.label }}</text>
      </view>
    </view>

    <!-- 状态筛选 Tab -->
    <scroll-view scroll-x class="status-tabs" :show-scrollbar="false">
      <view v-for="(label, key) in tabs" :key="key"
        :class="['tab-item', { active: filterStatus === key }]"
        @click="filterStatus = filterStatus === key ? '' : key">
        {{ label }}
      </view>
    </scroll-view>

    <!-- 订单列表 -->
    <scroll-view scroll-y class="order-list" @scrolltolower="loadMore">
      <view v-for="order in filteredOrders" :key="order.id" class="order-card">
        <!-- 头部 -->
        <view class="o-header">
          <view class="o-left">
            <text class="o-no">{{ order.orderNo }}</text>
            <text class="o-time">{{ order.createdAt }}</text>
          </view>
          <view class="o-status-badge" :style="{ background: statusColorMap[order.status] }">
            {{ statusMap[order.status] }}
          </view>
          <!-- 推广员佣金 -->
          <view class="commission-tag" v-if="appStore.currentRole === 'promoter' && order.commission">
            预计佣金 ¥{{ order.commission }}
          </view>
        </view>

        <!-- 商户信息 -->
        <view class="o-merchant">
          <text class="o-merchant-name">🏪 {{ order.merchantName }}</text>
          <text class="o-merchant-phone" @click="callPhone(order.merchantPhone)">📞</text>
        </view>

        <!-- 商品清单（折叠） -->
        <view class="o-items" v-if="expandedOrderId === order.id">
          <view v-for="(item, i) in order.items" :key="i" class="o-item-row">
            <text class="oi-name">{{ item.name }}</text>
            <text class="oi-spec">{{ item.spec }}</text>
            <text class="oi-qty">×{{ item.quantity }}</text>
            <text class="oi-price">¥{{ item.price * item.quantity }}</text>
          </view>
        </view>
        <view class="o-toggle" @click="toggleExpand(order.id)">
          <text>{{ expandedOrderId === order.id ? '收起' : '展开' }}商品 ({{ order.items.length }}种)</text>
        </view>

        <!-- 底部 -->
        <view class="o-footer">
          <view class="o-amount">
            <text class="o-total">合计 ¥{{ order.totalAmount.toLocaleString() }}</text>
            <text class="o-note" v-if="order.note">备注: {{ order.note }}</text>
          </view>
          <!-- 角色操作按钮 -->
          <view class="o-actions">
            <!-- 业务员 -->
            <template v-if="appStore.currentRole === 'salesperson'">
              <view v-if="order.status === 'pending'" class="btn primary" @click="handleAction(order, 'accept')">确认接单</view>
              <view v-if="order.status === 'accepted'" class="btn primary" @click="handleAction(order, 'dispatch-maker')">派单给制作员</view>
              <view v-if="order.status === 'made'" class="btn primary" @click="handleAction(order, 'dispatch-delivery')">分配配送员</view>
            </template>
            <!-- 制作员 -->
            <template v-if="appStore.currentRole === 'maker'">
              <view v-if="order.status === 'making'" class="btn warning" @click="handleAction(order, 'maker-complete')">制作完成</view>
            </template>
            <!-- 配送员 -->
            <template v-if="appStore.currentRole === 'delivery'">
              <view v-if="order.status === 'delivering'" class="btn success" @click="handleAction(order, 'delivery-done')">确认送达</view>
            </template>
            <!-- 商户 -->
            <template v-if="appStore.currentRole === 'merchant'">
              <view v-if="order.status === 'delivered'" class="btn outline" @click="handleAction(order, 'reorder')">再次下单</view>
              <view v-if="order.status === 'pending'" class="btn outline" @click="callPhone(order.salespersonPhone || '')">联系业务员</view>
            </template>
          </view>
        </view>
      </view>
      <view v-if="filteredOrders.length === 0" class="empty">暂无订单</view>
    </scroll-view>

    <!-- 操作确认弹窗 -->
    <view v-if="confirmDialog.show" class="modal-mask" @click="confirmDialog.show = false">
      <view class="confirm-box" @click.stop>
        <text class="confirm-title">{{ confirmDialog.title }}</text>
        <text class="confirm-desc">{{ confirmDialog.desc }}</text>
        <view class="confirm-btns">
          <view class="c-btn cancel" @click="confirmDialog.show = false">取消</view>
          <view class="c-btn primary" @click="doConfirm">确认</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { mockOrders, statusMap, statusColorMap } from '@/mock/index'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const filterStatus = ref('')
const expandedOrderId = ref<number | null>(null)
const confirmDialog = reactive({ show: false, title: '', desc: '', orderId: 0, action: '' })
const confirmCallback = ref<(() => void) | null>(null)

const tabs = statusMap

const stats = computed(() => {
  const counts: Record<string, number> = {}
  mockOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })
  return [
    { label: '待接单', count: counts.pending || 0, color: '#E6A23C', status: 'pending' },
    { label: '制作中', count: counts.making || 0, color: '#67C23A', status: 'making' },
    { label: '待配送', count: counts.delivering || 0, color: '#409EFF', status: 'delivering' },
    { label: '已完成', count: counts.delivered || 0, color: '#909399', status: 'delivered' },
  ]
})

const filteredOrders = computed(() => {
  if (filterStatus.value) return mockOrders.filter(o => o.status === filterStatus.value)
  return mockOrders
})

function toggleExpand(id: number) { expandedOrderId.value = expandedOrderId.value === id ? null : id }
function loadMore() {}
function callPhone(phone: string) { uni.makePhoneCall({ phoneNumber: phone }) }

function handleAction(order: any, action: string) {
  const titles: Record<string, string> = {
    accept: '确认接单', 'dispatch-maker': '派单给制作员', 'dispatch-delivery': '分配配送员',
    'maker-complete': '制作完成', 'delivery-done': '确认送达', reorder: '再次下单',
  }
  confirmDialog.show = true
  confirmDialog.title = titles[action] || action
  confirmDialog.desc = `订单 ${order.orderNo} — ${order.merchantName}\n金额 ¥${order.totalAmount}`
  confirmDialog.orderId = order.id
  confirmDialog.action = action
  confirmCallback.value = () => { uni.showToast({ title: '操作成功（Mock）', icon: 'success' }); confirmDialog.show = false }
}

function doConfirm() { confirmCallback.value?.() }
</script>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; background: #f5f6f8; }
.stats-row { display: flex; gap: 8px; padding: 12px 12px 4px; flex-shrink: 0; }
.stat-card { flex: 1; background: #fff; border-radius: 10px; padding: 12px 8px; text-align: center; border-top: 3px solid #ddd; }
.stat-num { font-size: 22px; font-weight: 700; display: block; }
.stat-label { font-size: 11px; color: #999; margin-top: 2px; }
.status-tabs { white-space: nowrap; padding: 8px 12px; flex-shrink: 0; }
.tab-item { display: inline-block; padding: 7px 16px; margin-right: 8px; border-radius: 16px; font-size: 13px; background: #fff; color: #666; }
.tab-item.active { background: #1a73e8; color: #fff; font-weight: 600; }
.order-list { flex: 1; padding: 8px 12px; }
.order-card { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.o-header { display: flex; align-items: center; margin-bottom: 8px; position: relative; }
.o-left { flex: 1; }
.o-no { font-size: 15px; font-weight: 700; }
.o-time { font-size: 11px; color: #999; display: block; margin-top: 2px; }
.o-status-badge { padding: 4px 12px; border-radius: 12px; color: #fff; font-size: 12px; font-weight: 600; }
.commission-tag { position: absolute; right: 0; top: -4px; font-size: 10px; color: #e8453c; background: #fff0f0; padding: 2px 8px; border-radius: 8px; }
.o-merchant { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.o-merchant-name { font-size: 14px; color: #333; }
.o-merchant-phone { font-size: 18px; }
.o-items { background: #f9fafb; border-radius: 8px; padding: 8px; margin-bottom: 4px; }
.o-item-row { display: flex; align-items: center; padding: 3px 0; font-size: 12px; gap: 6px; }
.oi-name { font-weight: 500; }
.oi-spec { color: #999; flex: 1; }
.oi-qty { color: #666; }
.oi-price { color: #e8453c; font-weight: 600; }
.o-toggle { padding: 4px 0; }
.o-toggle text { font-size: 12px; color: #1a73e8; }
.o-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
.o-total { font-size: 16px; font-weight: 700; color: #e8453c; }
.o-note { font-size: 11px; color: #999; display: block; }
.o-actions { display: flex; gap: 8px; }
.btn { padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #fff; }
.btn.primary { background: #1a73e8; }
.btn.warning { background: #E6A23C; }
.btn.success { background: #67C23A; }
.btn.outline { border: 1px solid #1a73e8; color: #1a73e8; background: #fff; }
.empty { text-align: center; padding: 60px 0; color: #999; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: center; justify-content: center; }
.confirm-box { width: 300px; background: #fff; border-radius: 16px; padding: 24px; }
.confirm-title { font-size: 17px; font-weight: 700; display: block; margin-bottom: 8px; }
.confirm-desc { font-size: 14px; color: #666; display: block; margin-bottom: 20px; white-space: pre-line; }
.confirm-btns { display: flex; gap: 12px; }
.c-btn { flex: 1; text-align: center; padding: 12px; border-radius: 10px; font-size: 15px; font-weight: 600; }
.c-btn.cancel { background: #f5f6f8; color: #666; }
.c-btn.primary { background: #1a73e8; color: #fff; }
</style>

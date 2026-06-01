<template>
  <div>
    <h3>数据看板</h3>
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="4" v-for="card in cards" :key="card.label">
        <el-card shadow="hover">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value" :style="{ color: card.color }">{{ card.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="14">
        <el-card>
          <template #header>近7日订单趋势</template>
          <v-chart :option="trendOption" style="height: 300px;" autoresize />
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>收益分布</template>
          <v-chart :option="earningsOption" style="height: 300px;" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;" v-if="lowStock.length">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span style="color: #e8453c;">📦 库存预警 ({{ lowStock.length }} 项)</span>
          </template>
          <el-table :data="lowStock" size="small" stripe>
            <el-table-column prop="name" label="商品" />
            <el-table-column prop="stock" label="当前库存" width="100" />
            <el-table-column prop="minStock" label="最低库存" width="100" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column label="状态" width="100">
              <template #default><el-tag type="danger" size="small">需补货</el-tag></template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { dashboardApi } from '@/api/index'

use([CanvasRenderer, BarChart, PieChart, TooltipComponent, LegendComponent, GridComponent])

const stats = ref({ todayOrders: 0, todayAmount: 0, pendingOrders: 0, makingOrders: 0, deliveringOrders: 0, totalUsers: 0 })
const trend = ref<any[]>([])
const earningsData = ref<any>({ byRole: [], totalPaid: 0, totalPending: 0 })
const lowStock = ref<any[]>([])

const cards = computed(() => [
  { label: '今日订单', value: stats.value.todayOrders, color: '#409EFF' },
  { label: '今日金额', value: '¥' + Number(stats.value.todayAmount).toFixed(2), color: '#67C23A' },
  { label: '待处理', value: stats.value.pendingOrders, color: '#E6A23C' },
  { label: '制作中', value: stats.value.makingOrders, color: '#F56C6C' },
  { label: '配送中', value: stats.value.deliveringOrders, color: '#909399' },
  { label: '总用户数', value: stats.value.totalUsers, color: '#337ECC' },
])

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: trend.value.map((t: any) => t.date.slice(5)) },
  yAxis: [{ type: 'value', name: '单数' }, { type: 'value', name: '金额(元)' }],
  series: [
    { name: '订单数', type: 'bar', data: trend.value.map((t: any) => t.count), itemStyle: { color: '#409EFF' }, barMaxWidth: 30 },
    { name: '金额', type: 'line', yAxisIndex: 1, data: trend.value.map((t: any) => t.amount), itemStyle: { color: '#67C23A' } },
  ],
  grid: { left: 50, right: 50, top: 20, bottom: 30 },
}))

const earningsOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{
    type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
    data: earningsData.value.byRole.map((e: any) => ({
      name: roleLabel(e.role), value: e.total,
    })),
    label: { formatter: '{b}\n{d}%' },
    itemStyle: { borderRadius: 4 },
  }],
}))

function roleLabel(r: string) {
  const m: Record<string, string> = { salesperson: '业务员', maker: '制作员', delivery: '配送员', promoter: '推广员' }
  return m[r] || r
}

onMounted(async () => {
  const [s, t, e, ls] = await Promise.allSettled([
    dashboardApi.stats(), dashboardApi.trend(7),
    ((await fetch('/api/dashboard/earnings-summary')).json()).then((r: any) => r.data),
    ((await fetch('/api/dashboard/low-stock')).json()).then((r: any) => r.data),
  ])
  stats.value = (s as any).value || stats.value
  trend.value = (t as any).value || []
  earningsData.value = (e as any).value || { byRole: [], totalPaid: 0, totalPending: 0 }
  lowStock.value = (ls as any).value || []
})
</script>

<style scoped>
.stat-label { font-size: 14px; color: #909399; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: bold; }
</style>

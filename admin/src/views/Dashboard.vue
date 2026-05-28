<template>
  <div>
    <h3>数据看板</h3>
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <el-card shadow="hover">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value" :style="{ color: card.color }">{{ card.value }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card>
      <template #header>近7日订单趋势</template>
      <div style="height: 300px">
        <el-empty v-if="!trend.length" description="暂无数据" />
        <div v-else class="trend-chart">
          <div v-for="(item, i) in trend" :key="i" class="trend-bar-group">
            <div class="trend-bar" :style="{ height: (item.count / maxCount) * 200 + 'px' }" :title="item.count + '单'"></div>
            <div class="trend-date">{{ item.date.slice(5) }}</div>
            <div class="trend-count">{{ item.count }}</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { dashboardApi } from '@/api/index'

const stats = ref({ todayOrders: 0, todayAmount: 0, pendingOrders: 0, makingOrders: 0, deliveringOrders: 0, totalUsers: 0 })
const trend = ref<any[]>([])

const cards = computed(() => [
  { label: '今日订单', value: stats.value.todayOrders, color: '#409EFF' },
  { label: '今日金额', value: '¥' + Number(stats.value.todayAmount).toFixed(2), color: '#67C23A' },
  { label: '待处理', value: stats.value.pendingOrders, color: '#E6A23C' },
  { label: '制作中', value: stats.value.makingOrders, color: '#F56C6C' },
  { label: '配送中', value: stats.value.deliveringOrders, color: '#909399' },
  { label: '总用户数', value: stats.value.totalUsers, color: '#337ECC' },
])
const maxCount = computed(() => Math.max(...trend.value.map((t: any) => t.count), 1))

onMounted(async () => {
  const [s, t] = await Promise.all([dashboardApi.stats(), dashboardApi.trend(7)])
  stats.value = s
  trend.value = t
})
</script>

<style scoped>
.stat-label { font-size: 14px; color: #909399; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: bold; }
.trend-chart { display: flex; align-items: flex-end; justify-content: space-around; height: 100%; padding-top: 20px; }
.trend-bar-group { display: flex; flex-direction: column; align-items: center; }
.trend-bar { width: 40px; background: linear-gradient(180deg, #409EFF, #79bbff); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s; }
.trend-date { font-size: 12px; color: #909399; margin-top: 4px; }
.trend-count { font-size: 12px; color: #303133; font-weight: bold; }
</style>

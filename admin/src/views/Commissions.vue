<template>
  <div>
    <el-card>
      <template #header>
        <span>提成比例设置</span>
      </template>
      <div style="margin-bottom: 16px;">
        <el-select v-model="form.categoryId" placeholder="选择分类" style="width: 160px; margin-right: 10px;">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-select v-model="form.role" placeholder="选择角色" style="width: 130px; margin-right: 10px;">
          <el-option label="业务员" value="salesperson" />
          <el-option label="制作员" value="maker" />
          <el-option label="配送员" value="delivery" />
          <el-option label="推广员" value="promoter" />
        </el-select>
        <el-input-number v-model="form.percentage" :min="0" :max="100" :precision="1" style="width: 150px; margin-right: 10px;" />
        <span style="margin-right: 10px;">%</span>
        <el-button type="primary" @click="handleSetRule">添加/修改</el-button>
      </div>
      <el-table :data="rules" stripe>
        <el-table-column prop="category.name" label="商品分类" width="150" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">{{ roleMap[row.role] || row.role }}</template>
        </el-table-column>
        <el-table-column prop="percentage" label="提成比例(%)" width="150">
          <template #default="{ row }">{{ Number(row.percentage) }}%</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { commissionApi, categoryApi } from '@/api/index'

const rules = ref<any[]>([])
const categories = ref<any[]>([])
const form = reactive({ categoryId: null as number | null, role: 'salesperson', percentage: 5 })
const roleMap: Record<string, string> = { salesperson: '业务员', maker: '制作员', delivery: '配送员', promoter: '推广员' }

async function fetchRules() {
  rules.value = await commissionApi.list()
  categories.value = await categoryApi.list()
}

async function handleSetRule() {
  if (!form.categoryId) { ElMessage.warning('请选择分类'); return }
  await commissionApi.setRule({ categoryId: form.categoryId, role: form.role, percentage: form.percentage })
  ElMessage.success('设置成功')
  fetchRules()
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确定删除?', '提示', { type: 'warning' })
  await commissionApi.deleteRule(id)
  ElMessage.success('删除成功')
  fetchRules()
}

onMounted(fetchRules)
</script>

<template>
  <div>
    <el-card>
      <template #header>
        <div class="toolbar">
          <span>商品提成设置</span>
          <div class="filters">
            <el-select v-model="filterCategoryId" placeholder="商品分类" clearable style="width: 150px;">
              <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-input v-model="keyword" placeholder="搜索商品名称" clearable style="width: 220px;" @keyup.enter="fetchRules" />
            <el-button type="primary" @click="fetchRules">查询</el-button>
          </div>
        </div>
      </template>

      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column prop="name" label="商品名称" min-width="160" />
        <el-table-column prop="category.name" label="分类" width="120" />
        <el-table-column label="单价" width="100">
          <template #default="{ row }">¥{{ money(row.price) }}</template>
        </el-table-column>
        <el-table-column v-for="role in roles" :key="role.key" :label="role.label" width="140">
          <template #default="{ row }">
            <el-tag v-if="getRoleRules(row, role.key).length" type="success">
              已设置 {{ getRoleRules(row, role.key).length }} 人
            </el-tag>
            <el-tag v-else type="info">未设置</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDialog(row)">设置</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="`设置提成 - ${currentProduct?.name || ''}`" width="860px">
      <el-alert
        v-if="ruleForm.length === 0"
        title="暂无可设置提成的配送员或推广员"
        description="请先在员工管理中新增并启用配送员或推广员。"
        type="warning"
        show-icon
        :closable="false"
        class="empty-alert"
      />
      <el-table :data="ruleForm" border>
        <el-table-column prop="label" label="角色" width="100" />
        <el-table-column label="员工" min-width="160">
          <template #default="{ row }">
            <div>{{ row.realName }}</div>
            <div class="employee-phone">{{ row.phone || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" />
          </template>
        </el-table-column>
        <el-table-column label="提成方式" width="160">
          <template #default="{ row }">
            <el-select v-model="row.type" :disabled="!row.enabled" style="width: 130px;">
              <el-option label="百分比" value="percentage" />
              <el-option label="固定金额" value="fixed" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="提成数值">
          <template #default="{ row }">
            <el-input-number
              v-model="row.value"
              :disabled="!row.enabled"
              :min="0"
              :max="row.type === 'percentage' ? 100 : 9999"
              :precision="2"
              style="width: 180px;"
            />
            <span class="unit-text">{{ row.type === 'percentage' ? '%' : '元/件' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { commissionApi, categoryApi } from '@/api/index'

const roles = [
  { key: 'delivery', label: '配送员' },
  { key: 'promoter', label: '推广员' },
]

const loading = ref(false)
const saving = ref(false)
const products = ref<any[]>([])
const categories = ref<any[]>([])
const filterCategoryId = ref<number | null>(null)
const keyword = ref('')
const dialogVisible = ref(false)
const currentProduct = ref<any>(null)
const ruleForm = ref<any[]>([])
const employees = ref<any[]>([])

function money(value: any) {
  return Number(value || 0).toFixed(2)
}

function getRoleRules(product: any, role: string) {
  return (product.rules || []).filter((item: any) => item.role === role && item.userId)
}

function getRule(product: any, role: string, userId: number) {
  return (product.rules || []).find((item: any) => item.role === role && item.userId === userId)
}

async function fetchRules() {
  loading.value = true
  try {
    const params: any = {}
    if (filterCategoryId.value) params.categoryId = filterCategoryId.value
    if (keyword.value) params.keyword = keyword.value
    const [productRules, categoryList, staffList] = await Promise.all([
      commissionApi.list(params),
      categoryApi.list(),
      commissionApi.staff(),
    ])
    products.value = productRules
    categories.value = categoryList
    employees.value = staffList
  } finally {
    loading.value = false
  }
}

function showDialog(product: any) {
  currentProduct.value = product
  ruleForm.value = employees.value.map((employee) => {
    const role = roles.find((item) => item.key === employee.role)
    const rule = getRule(product, employee.role, employee.id)
    return {
      role: employee.role,
      userId: employee.id,
      realName: employee.realName,
      phone: employee.phone,
      label: role?.label || employee.role,
      enabled: Boolean(rule),
      type: rule?.type || 'percentage',
      value: Number(rule?.value || 0),
    }
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!currentProduct.value) return
  saving.value = true
  try {
    await commissionApi.setProductRules(currentProduct.value.id, ruleForm.value)
    ElMessage.success('提成规则已保存')
    dialogVisible.value = false
    fetchRules()
  } finally {
    saving.value = false
  }
}

onMounted(fetchRules)
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.filters { display: flex; align-items: center; gap: 10px; }
.unit-text { margin-left: 8px; color: #606266; }
.employee-phone { color: #909399; font-size: 12px; margin-top: 2px; }
.empty-alert { margin-bottom: 12px; }
</style>

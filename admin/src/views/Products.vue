<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between;">
          <span>商品管理</span>
          <div>
            <el-select v-model="filterCategoryId" placeholder="筛选分类" clearable style="width: 130px; margin-right: 10px;">
              <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button type="primary" @click="showProductDialog()">新增商品</el-button>
            <el-button @click="categoryDialogVisible = true" style="margin-left: 8px;">管理分类</el-button>
          </div>
        </div>
      </template>
      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column prop="name" label="商品名称" />
        <el-table-column prop="category.name" label="分类" width="120" />
        <el-table-column prop="price" label="单价" width="100">
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '上架' : '下架' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button type="primary" link @click="showProductDialog(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 商品弹窗 -->
    <el-dialog v-model="productDialogVisible" :title="productForm.id ? '编辑商品' : '新增商品'" width="500px">
      <el-form :model="productForm" label-width="80px">
        <el-form-item label="商品名称">
          <el-input v-model="productForm.name" />
        </el-form-item>
        <el-form-item label="所属分类">
          <el-select v-model="productForm.categoryId" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="productForm.price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="productForm.unit" placeholder="如：杯、瓶" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="productForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="productForm.status" :active-value="1" :inactive-value="0" active-text="上架" inactive-text="下架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="productDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveProduct">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分类弹窗 -->
    <el-dialog v-model="categoryDialogVisible" title="分类管理" width="500px">
      <div style="margin-bottom: 12px;">
        <el-input v-model="newCategoryName" placeholder="输入分类名称" style="width: 200px; margin-right: 10px;" />
        <el-button type="primary" @click="handleAddCategory">添加</el-button>
      </div>
      <el-table :data="categories" stripe max-height="400">
        <el-table-column prop="name" label="名称" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="danger" link @click="handleDeleteCategory(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { productApi, categoryApi } from '@/api/index'

const loading = ref(false)
const products = ref<any[]>([])
const categories = ref<any[]>([])
const filterCategoryId = ref<number | undefined>()
const productDialogVisible = ref(false)
const categoryDialogVisible = ref(false)
const newCategoryName = ref('')
const productForm = ref<any>({ name: '', categoryId: null, price: 0, unit: '杯', description: '', status: 1 })

async function fetchProducts() {
  loading.value = true
  try {
    const params: any = {}
    if (filterCategoryId.value) params.categoryId = filterCategoryId.value
    const data = await productApi.list(params)
    products.value = data.list
  } finally { loading.value = false }
}

async function fetchCategories() {
  categories.value = await categoryApi.list()
}

function showProductDialog(row?: any) {
  productForm.value = row ? { ...row } : { name: '', categoryId: null, price: 0, unit: '杯', description: '', status: 1 }
  productDialogVisible.value = true
}

async function handleSaveProduct() {
  if (productForm.value.id) {
    await productApi.update(productForm.value.id, productForm.value)
    ElMessage.success('更新成功')
  } else {
    await productApi.create(productForm.value)
    ElMessage.success('创建成功')
  }
  productDialogVisible.value = false
  fetchProducts()
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确定删除?', '提示', { type: 'warning' })
  await productApi.remove(id)
  ElMessage.success('删除成功')
  fetchProducts()
}

async function handleAddCategory() {
  if (!newCategoryName.value) return
  await categoryApi.create({ name: newCategoryName.value })
  ElMessage.success('添加成功')
  newCategoryName.value = ''
  fetchCategories()
}

async function handleDeleteCategory(id: number) {
  await ElMessageBox.confirm('确定删除此分类?', '提示', { type: 'warning' })
  await categoryApi.remove(id)
  ElMessage.success('删除成功')
  fetchCategories()
}

onMounted(() => { fetchProducts(); fetchCategories() })
</script>

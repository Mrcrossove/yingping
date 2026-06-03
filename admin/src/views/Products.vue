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
        <el-table-column label="图片" width="90">
          <template #default="{ row }">
            <img v-if="row.image" class="product-thumb" :src="imageUrl(row.image)" />
            <div v-else class="product-thumb empty">无图</div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" />
        <el-table-column prop="category.name" label="分类" width="120" />
        <el-table-column prop="price" label="单价" width="100">
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column label="库存" width="120">
          <template #default="{ row }">
            <el-tag :type="isLowStock(row) ? 'danger' : 'success'">
              {{ row.stock ?? 0 }} / 警戒 {{ row.minStock ?? 10 }}
            </el-tag>
          </template>
        </el-table-column>
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
      <el-form ref="productFormRef" :model="productForm" :rules="productRules" label-width="110px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="productForm.name" />
        </el-form-item>
        <el-form-item label="所属分类" prop="categoryId">
          <el-select v-model="productForm.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="单价" prop="price">
          <el-input-number v-model="productForm.price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="商品图片">
          <el-upload
            class="product-uploader"
            action="#"
            :show-file-list="false"
            :http-request="handleImageUpload"
            accept="image/*"
          >
            <img v-if="productForm.image" class="product-preview" :src="imageUrl(productForm.image)" />
            <div v-else class="upload-placeholder">点击上传商品图片</div>
          </el-upload>
          <div class="upload-tip">建议 800x800，单张不超过 5MB，支持 jpg/png/webp/gif。</div>
        </el-form-item>
        <el-form-item label="制作提成(元)">
          <el-input-number v-model="productForm.makerRate" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="配送提成(元)">
          <el-input-number v-model="productForm.deliveryRate" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="productForm.stock" :min="0" :precision="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最低库存">
          <el-input-number v-model="productForm.minStock" :min="0" :precision="0" style="width: 100%" />
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
        <el-button type="primary" :loading="saving" @click="handleSaveProduct">保存</el-button>
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
import type { FormInstance, FormRules } from 'element-plus'
import { productApi, categoryApi, fileApi } from '@/api/index'
import { UPLOADS_BASE_URL } from '@/config'

const loading = ref(false)
const saving = ref(false)
const products = ref<any[]>([])
const categories = ref<any[]>([])
const filterCategoryId = ref<number | undefined>()
const productDialogVisible = ref(false)
const categoryDialogVisible = ref(false)
const newCategoryName = ref('')
const productFormRef = ref<FormInstance>()
const productForm = ref<any>({ name: '', categoryId: null, price: 0, unit: '杯', description: '', status: 1 })
const productRules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入商品单价', trigger: 'change' }]
}

function imageUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return UPLOADS_BASE_URL + url
}

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
  productForm.value = row
    ? {
        ...row,
        categoryId: row.categoryId ?? row.category?.id ?? null
      }
    : { name: '', categoryId: null, price: 0, unit: '杯', description: '', status: 1, makerRate: 0, deliveryRate: 0, stock: 0, minStock: 10 }
  productDialogVisible.value = true
  productFormRef.value?.clearValidate()
}

function isLowStock(row: any) {
  return Number(row.stock || 0) <= Number(row.minStock || 10)
}

async function handleSaveProduct() {
  await productFormRef.value?.validate()
  const payload = buildProductPayload()

  saving.value = true
  try {
    if (productForm.value.id) {
      await productApi.update(productForm.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await productApi.create(payload)
      ElMessage.success('创建成功')
    }
    productDialogVisible.value = false
    fetchProducts()
  } finally {
    saving.value = false
  }
}

async function handleImageUpload(options: any) {
  const data = await fileApi.upload(options.file)
  productForm.value.image = data.url
  ElMessage.success('图片上传成功')
}

function buildProductPayload() {
  const form = productForm.value
  return {
    name: form.name,
    categoryId: Number(form.categoryId),
    price: Number(form.price),
    image: form.image || undefined,
    unit: form.unit || '杯',
    description: form.description || '',
    status: Number(form.status ?? 1),
    stock: form.stock === undefined || form.stock === null || form.stock === '' ? undefined : Number(form.stock),
    minStock: form.minStock === undefined || form.minStock === null || form.minStock === '' ? undefined : Number(form.minStock),
    makerRate: form.makerRate === undefined || form.makerRate === null || form.makerRate === '' ? undefined : Number(form.makerRate),
    deliveryRate: form.deliveryRate === undefined || form.deliveryRate === null || form.deliveryRate === '' ? undefined : Number(form.deliveryRate)
  }
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

<style scoped>
.product-thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  background: #f5f7fa;
  display: block;
}
.product-thumb.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 12px;
}
.product-uploader {
  width: 100%;
}
.product-preview {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
  border: 1px solid #dcdfe6;
}
.upload-placeholder {
  width: 150px;
  height: 150px;
  border: 1px dashed #c0c4cc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  background: #fafafa;
}
.upload-tip {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}
</style>

<template>
  <div>
    <el-card>
      <template #header>
        <div class="toolbar">
          <span>轮播图管理</span>
          <el-button type="primary" @click="showDialog()">新增轮播图</el-button>
        </div>
      </template>

      <el-table :data="banners" v-loading="loading" stripe>
        <el-table-column label="图片" width="220">
          <template #default="{ row }">
            <img class="banner-thumb" :src="imageUrl(row.image)" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="sort" label="排序" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDialog(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑轮播图' : '新增轮播图'" width="560px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="用于后台识别，可填写营业执照、门店照片等" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            class="banner-uploader"
            action="#"
            :show-file-list="false"
            :http-request="handleUpload"
            accept="image/*"
          >
            <img v-if="form.image" class="banner-preview" :src="imageUrl(form.image)" />
            <div v-else class="upload-placeholder">点击上传图片</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.link" placeholder="选填，小程序页面路径或外部链接" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { bannerApi, fileApi } from '@/api/index'
import { UPLOADS_BASE_URL } from '@/config'

const loading = ref(false)
const dialogVisible = ref(false)
const banners = ref<any[]>([])
const form = ref<any>({ title: '', image: '', link: '', sort: 0, status: 1 })

function imageUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return UPLOADS_BASE_URL + url
}

async function fetchBanners() {
  loading.value = true
  try {
    const data = await bannerApi.list({ pageSize: 100 })
    banners.value = data.list
  } finally {
    loading.value = false
  }
}

function showDialog(row?: any) {
  form.value = row ? { ...row } : { title: '', image: '', link: '', sort: 0, status: 1 }
  dialogVisible.value = true
}

async function handleUpload(options: any) {
  const data = await fileApi.upload(options.file)
  form.value.image = data.url
  if (!form.value.title) form.value.title = data.filename || '轮播图'
  ElMessage.success('上传成功')
}

async function handleSave() {
  if (!form.value.title || !form.value.image) {
    ElMessage.warning('请填写标题并上传图片')
    return
  }
  if (form.value.id) {
    await bannerApi.update(form.value.id, form.value)
    ElMessage.success('更新成功')
  } else {
    await bannerApi.create(form.value)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  fetchBanners()
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确定删除此轮播图?', '提示', { type: 'warning' })
  await bannerApi.remove(id)
  ElMessage.success('删除成功')
  fetchBanners()
}

onMounted(fetchBanners)
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.banner-thumb { width: 180px; height: 72px; object-fit: cover; border-radius: 6px; background: #f5f7fa; display: block; }
.banner-uploader { width: 100%; }
.banner-preview { width: 360px; height: 150px; object-fit: cover; border-radius: 8px; display: block; border: 1px solid #dcdfe6; }
.upload-placeholder { width: 360px; height: 150px; border: 1px dashed #c0c4cc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #909399; background: #fafafa; }
</style>

<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between;">
          <span>权限管理</span>
          <el-button type="primary" @click="handleInit">初始化默认权限</el-button>
        </div>
      </template>
      <el-table :data="permissions" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="权限名称" width="150" />
        <el-table-column prop="code" label="权限编码" />
        <el-table-column prop="description" label="描述" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { permissionApi } from '@/api/index'

const permissions = ref<any[]>([])

async function fetchPermissions() {
  permissions.value = await permissionApi.list()
}

async function handleInit() {
  await permissionApi.initDefaults()
  ElMessage.success('初始化完成')
  fetchPermissions()
}

onMounted(fetchPermissions)
</script>

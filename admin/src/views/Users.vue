<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between;">
          <span>员工管理</span>
          <div>
            <el-select v-model="filterRole" placeholder="筛选角色" clearable style="width: 130px; margin-right: 10px;">
              <el-option v-for="(v, k) in roleMap" :key="k" :label="v" :value="k" />
            </el-select>
            <el-input v-model="keyword" placeholder="搜索姓名/手机" clearable style="width: 200px; margin-right: 10px;" />
            <el-button type="primary" @click="showUserDialog()">新增员工</el-button>
          </div>
        </div>
      </template>
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="username" label="账号" width="130" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)">{{ roleMap[row.role] || row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showUserDialog(row)">编辑</el-button>
            <el-button v-if="canAssignPermission(row)" type="warning" link @click="showPermissionDialog(row)">权限</el-button>
            <el-button type="success" link @click="showResetPwd(row)">重置密码</el-button>
            <el-button type="danger" link @click="handleDelete(row.id)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 16px; text-align: right;">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchUsers" />
      </div>
    </el-card>

    <el-dialog v-model="userDialogVisible" :title="userForm.id ? '编辑员工' : '新增员工'" width="500px">
      <el-form :model="userForm" label-width="80px">
        <el-form-item label="账号">
          <el-input v-model="userForm.username" :disabled="!!userForm.id" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="userForm.password" placeholder="留空则不修改" show-password />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="userForm.realName" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" style="width: 100%" :disabled="!!userForm.id">
            <el-option label="管理员" value="admin" />
            <el-option label="业务员" value="salesperson" />
            <el-option label="制作员" value="maker" />
            <el-option label="配送员" value="delivery" />
            <el-option label="推广员" value="promoter" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item v-if="userForm.id" label="状态">
          <el-switch v-model="userForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveUser">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="permissionDialogVisible" title="管理权限配置" width="560px">
      <div v-loading="permissionLoading" class="permission-box">
        <el-alert
          v-if="!permissionLoading && !allPermissions.length"
          title="暂无可分配权限"
          description="系统会自动初始化默认权限；如果仍为空，请刷新页面或检查后端权限表迁移。"
          type="warning"
          show-icon
          :closable="false"
        />
        <el-checkbox-group v-else v-model="adminPermissionIds">
          <el-checkbox v-for="p in allPermissions" :key="p.id" :label="p.id" :value="p.id" class="permission-item">
            {{ p.name }} <span class="permission-code">({{ p.code }})</span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!allPermissions.length" @click="handleSavePermission">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetPwdVisible" title="重置密码" width="400px">
      <el-form>
        <el-form-item label="新密码">
          <el-input v-model="resetPwdForm.password" show-password placeholder="输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetPwd">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi, permissionApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const users = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const filterRole = ref('')
const userDialogVisible = ref(false)
const userForm = ref<any>({ username: '', password: '', realName: '', role: 'salesperson', phone: '', status: 1 })
const permissionDialogVisible = ref(false)
const permissionLoading = ref(false)
const currentAdminId = ref(0)
const allPermissions = ref<any[]>([])
const adminPermissionIds = ref<number[]>([])
const resetPwdVisible = ref(false)
const resetPwdForm = ref({ userId: 0, password: '' })

const roleMap: Record<string, string> = {
  boss: '老板', admin: '管理员', salesperson: '业务员',
  maker: '制作员', delivery: '配送员', promoter: '推广员',
}

function roleTagType(role: string) {
  const map: Record<string, string> = { boss: 'danger', admin: 'warning', salesperson: 'info', maker: '', delivery: 'success', promoter: 'info' }
  return map[role] || ''
}

function canAssignPermission(row: any) {
  return userStore.role === 'boss' && row.role === 'admin'
}

async function fetchUsers() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (filterRole.value) params.role = filterRole.value
    const data = await userApi.list(params)
    users.value = data.list
    total.value = data.total
  } finally { loading.value = false }
}

function showUserDialog(row?: any) {
  userForm.value = row ? { ...row, password: '' } : { username: '', password: '', realName: '', role: 'salesperson', phone: '', status: 1 }
  userDialogVisible.value = true
}

async function handleSaveUser() {
  if (userForm.value.id) {
    const data: any = { realName: userForm.value.realName, phone: userForm.value.phone, status: userForm.value.status }
    if (userForm.value.password) data.password = userForm.value.password
    await userApi.update(userForm.value.id, data)
    ElMessage.success('更新成功')
  } else {
    await userApi.create(userForm.value)
    ElMessage.success('创建成功')
  }
  userDialogVisible.value = false
  fetchUsers()
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确定切换状态?', '提示', { type: 'warning' })
  const user = users.value.find((u) => u.id === id)
  await userApi.update(id, { status: user?.status === 1 ? 0 : 1 })
  ElMessage.success('操作成功')
  fetchUsers()
}

async function showPermissionDialog(row: any) {
  currentAdminId.value = row.id
  permissionDialogVisible.value = true
  permissionLoading.value = true
  try {
    const [permissions, ap] = await Promise.all([
      permissionApi.list(),
      permissionApi.getAdminPermissions(row.id),
    ])
    allPermissions.value = permissions
    adminPermissionIds.value = ap.map((p: any) => p.permissionId)
  } finally {
    permissionLoading.value = false
  }
}

async function handleSavePermission() {
  await permissionApi.setAdminPermissions(currentAdminId.value, adminPermissionIds.value)
  ElMessage.success('权限设置保存成功，请让该管理员重新登录后台')
  permissionDialogVisible.value = false
}

function showResetPwd(row: any) {
  resetPwdForm.value = { userId: row.id, password: '' }
  resetPwdVisible.value = true
}

async function handleResetPwd() {
  if (!resetPwdForm.value.password) { ElMessage.warning('请输入新密码'); return }
  await userApi.update(resetPwdForm.value.userId, { password: resetPwdForm.value.password })
  ElMessage.success('密码重置成功')
  resetPwdVisible.value = false
}

watch([keyword, filterRole], () => { page.value = 1; fetchUsers() })
onMounted(fetchUsers)
</script>

<style scoped>
.permission-box { min-height: 120px; }
.permission-item { display: block; margin-bottom: 10px; }
.permission-code { color: #909399; font-size: 12px; }
</style>

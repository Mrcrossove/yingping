<template>
  <div>
    <el-card>
      <template #header>
        <span>系统设置</span>
      </template>

      <el-form class="settings-form" label-width="110px">
        <el-form-item label="客服电话">
          <el-input
            v-model="customerServicePhone"
            placeholder="业务员未绑定时，小程序订单页拨打此电话"
            clearable
          />
          <div class="field-tip">支持手机号或座机号。订单已绑定业务员时优先拨打业务员手机号。</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { settingApi } from '@/api/index'

const customerServicePhone = ref('')
const saving = ref(false)

async function fetchSettings() {
  const data = await settingApi.get()
  customerServicePhone.value = data.customerServicePhone || ''
}

async function handleSave() {
  saving.value = true
  try {
    await settingApi.updateCustomerServicePhone(customerServicePhone.value)
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

onMounted(fetchSettings)
</script>

<style scoped>
.settings-form { max-width: 560px; }
.field-tip { margin-top: 6px; color: #909399; font-size: 12px; line-height: 18px; }
</style>


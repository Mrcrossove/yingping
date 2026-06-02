<template>
  <view class="container">
    <view class="header">
      <text class="title">商户注册</text>
      <text class="desc">填写信息提交商家入驻申请</text>
    </view>

    <view class="form-card">
      <text class="section-title">基本信息</text>
      <input v-model="form.username" placeholder="登录账号" class="form-input" />
      <input v-model="form.password" type="password" placeholder="密码" class="form-input" />
      <input v-model="form.realName" placeholder="店铺名称" class="form-input" />
      <input v-model="form.phone" type="number" placeholder="手机号" class="form-input" />
    </view>

    <view class="form-card">
      <text class="section-title">店铺信息</text>
      <input v-model="form.shopAddress" placeholder="店铺地址" class="form-input" />
      <textarea v-model="form.description" placeholder="店铺简介 (选填)" class="form-textarea" />
    </view>

    <view class="agreement">
      <view class="agree-row" @click="agreed = !agreed">
        <text :class="['checkbox', { checked: agreed }]">{{ agreed ? '☑' : '☐' }}</text>
        <text>我已阅读并同意《商家入驻协议》</text>
      </view>
    </view>

    <button class="submit-btn" :disabled="!canSubmit || submitting" @click="handleSubmit">
      {{ submitting ? '提交中...' : '提交申请' }}
    </button>

    <text class="tip">提交后管理员将在1-2个工作日内审核</text>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const agreed = ref(false)
const submitting = ref(false)
const form = reactive({
  username: '', password: '', realName: '', phone: '',
  shopAddress: '', description: '',
})

const canSubmit = computed(() =>
  form.username && form.password && form.realName && form.phone && agreed.value
)

async function handleSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    await userStore.register({
      username: form.username, password: form.password,
      realName: form.realName,
      phone: form.phone,
      role: 'merchant',
      shopAddress: form.shopAddress,
      description: form.description,
    })
    uni.showToast({ title: '注册申请已提交，等待审核', icon: 'success', duration: 2000 })
    setTimeout(() => uni.navigateBack(), 2000)
  } catch {
    uni.showToast({ title: '注册失败，请重试', icon: 'none' })
  } finally { submitting.value = false }
}
</script>

<style scoped>
.container { padding: 20px; }
.header { text-align: center; margin-bottom: 24px; }
.title { font-size: 22px; font-weight: 700; display: block; }
.desc { font-size: 13px; color: #999; margin-top: 6px; display: block; }
.form-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; display: block; }
.form-input { border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 10px; font-size: 14px; }
.form-textarea { border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 10px; font-size: 14px; min-height: 80px; width: 100%; box-sizing: border-box; }
.agreement { margin: 12px 0; }
.agree-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #666; }
.checkbox { font-size: 18px; }
.checkbox.checked { color: #1a73e8; }
.submit-btn { background: #1a73e8; color: #fff; border: none; border-radius: 24px; padding: 14px; font-size: 16px; font-weight: 600; margin-top: 20px; width: 100%; }
.submit-btn[disabled] { opacity: 0.5; }
.tip { text-align: center; font-size: 12px; color: #999; margin-top: 12px; display: block; }
</style>

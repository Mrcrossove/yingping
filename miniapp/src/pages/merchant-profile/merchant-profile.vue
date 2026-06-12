<template>
  <view class="page">
    <view class="form-card">
      <view class="field">
        <text class="label">商户名称</text>
        <input v-model="form.shopName" class="input" placeholder="请输入店铺或公司名称" />
      </view>
      <view class="field">
        <text class="label">联系人</text>
        <input v-model="form.contactName" class="input" placeholder="请输入联系人姓名" />
      </view>
      <view class="field">
        <text class="label">联系电话</text>
        <input v-model="form.contactPhone" class="input" type="number" placeholder="请输入手机号" />
      </view>
      <view class="field">
        <text class="label">店铺地址</text>
        <input v-model="form.shopAddress" class="input" placeholder="请输入店铺地址" />
      </view>
      <view class="field">
        <text class="label">备注</text>
        <textarea v-model="form.description" class="textarea" placeholder="可填写门店说明、配送要求等" />
      </view>
    </view>
    <button class="save-btn" :loading="loading" @click="handleSave">保存商户信息</button>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { userApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const form = reactive({
  shopName: '',
  contactName: '',
  contactPhone: '',
  shopAddress: '',
  description: '',
})

async function fetchProfile() {
  if (!userStore.isLoggedIn) return
  const data = await userApi.myMerchantProfile()
  const profile = data.merchantProfile || {}
  form.shopName = profile.shopName || data.realName || ''
  form.contactName = profile.contactName || ''
  form.contactPhone = profile.contactPhone || data.phone || ''
  form.shopAddress = profile.shopAddress || ''
  form.description = profile.description || ''
}

async function handleSave() {
  if (!form.shopName.trim()) {
    uni.showToast({ title: '请填写商户名称', icon: 'none' })
    return
  }
  if (!form.contactName.trim()) {
    uni.showToast({ title: '请填写联系人', icon: 'none' })
    return
  }
  if (!/^1\d{10}$/.test(form.contactPhone)) {
    uni.showToast({ title: '请填写正确手机号', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const data = await userApi.updateMyMerchantProfile(form)
    userStore.updateUser({
      ...userStore.user,
      realName: data.realName,
      phone: data.phone,
      merchantProfile: data.merchantProfile,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } finally {
    loading.value = false
  }
}

onShow(fetchProfile)
</script>

<style scoped>
.page { min-height: 100vh; background: #f4f7f2; padding: 12px; box-sizing: border-box; }
.form-card { background: #fff; border-radius: 12px; padding: 4px 14px; box-shadow: 0 0 0 1px #e8edf4 inset; }
.field { padding: 14px 0; border-bottom: 1px solid #f1f3f5; }
.field:last-child { border-bottom: none; }
.label { display: block; font-size: 14px; font-weight: 700; color: #172033; margin-bottom: 8px; }
.input { height: 42px; border: 1px solid #d9e2ee; border-radius: 10px; padding: 0 10px; font-size: 14px; box-sizing: border-box; background: #fbfcfe; }
.textarea { width: 100%; min-height: 88px; border: 1px solid #d9e2ee; border-radius: 10px; padding: 10px; font-size: 14px; box-sizing: border-box; background: #fbfcfe; }
.save-btn { margin-top: 16px; background: #2f8a5a; color: #fff; border: none; border-radius: 12px; padding: 12px; font-size: 16px; font-weight: 700; }
</style>

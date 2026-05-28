<template>
  <view class="container">
    <view v-if="myCode" class="promo-card">
      <text class="promo-label">我的推广码</text>
      <text class="promo-code">{{ myCode.code }}</text>
      <text class="promo-tip">分享此推广码给商户，绑定后商户所有消费你都有提成</text>
    </view>
    <view v-else class="generate-section">
      <button @click="handleGenerate" class="gen-btn">生成推广码</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onShow } from 'vue'
import { promotionApi } from '@/api/index'

const myCode = ref<any>(null)

async function fetchCode() {
  try {
    myCode.value = await promotionApi.myCode()
  } catch {
    myCode.value = null
  }
}

async function handleGenerate() {
  myCode.value = await promotionApi.generateCode()
  uni.showToast({ title: '推广码已生成', icon: 'success' })
}

onShow(fetchCode)
</script>

<style scoped>
.container { padding: 20px; }
.promo-card { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 30px; text-align: center; color: #fff; }
.promo-label { font-size: 14px; opacity: 0.8; }
.promo-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 12px 0; display: block; }
.promo-tip { font-size: 12px; opacity: 0.7; display: block; }
.generate-section { text-align: center; margin-top: 60px; }
.gen-btn { background: #409EFF; color: #fff; border: none; border-radius: 8px; padding: 14px 40px; font-size: 16px; }
</style>

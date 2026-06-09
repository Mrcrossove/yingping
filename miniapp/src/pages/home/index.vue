<template>
  <view class="redirect-page">
    <text>正在打开...</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

onLoad((options: any) => {
  userStore.capturePromoterCode({ query: options })
  const query = Object.entries(options || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&')
  uni.reLaunch({ url: `/pages/index/index${query ? `?${query}` : ''}` })
})
</script>

<style scoped>
.redirect-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7b8494;
  font-size: 14px;
  background: #f5f6f8;
}
</style>

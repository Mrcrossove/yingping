<template>
  <view class="container">
    <view v-for="n in list" :key="n.id" :class="['noti-item', { unread: !n.read }]" @click="markRead(n.id)">
      <view class="ni-left">
        <text class="ni-dot" v-if="!n.read"></text>
        <view class="ni-text">
          <text class="ni-title">{{ n.title }}</text>
          <text class="ni-content" v-if="n.content">{{ n.content }}</text>
          <text class="ni-time">{{ n.createdAt }}</text>
        </view>
      </view>
    </view>
    <view v-if="list.length === 0" class="empty">暂无消息</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post } from '@/utils/request'

const list = ref<any[]>([])

async function fetchList() {
  try {
    const data = await get('/notifications', { pageSize: 50 })
    list.value = data.list || []
  } catch {
    list.value = []
  }
}

async function markRead(id: number) {
  await post(`/notifications/${id}/read`)
  const item = list.value.find(n => n.id === id)
  if (item) item.read = true
}

onShow(fetchList)
</script>

<style scoped>
.container { padding: 10px; }
.noti-item { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 8px; display: flex; }
.noti-item.unread { border-left: 3px solid #1a73e8; }
.ni-left { display: flex; align-items: flex-start; flex: 1; }
.ni-dot { width: 8px; height: 8px; border-radius: 50%; background: #e8453c; margin-right: 8px; margin-top: 6px; flex-shrink: 0; }
.ni-text { display: flex; flex-direction: column; flex: 1; }
.ni-title { font-size: 15px; font-weight: 600; }
.ni-content { font-size: 13px; color: #666; margin-top: 4px; }
.ni-time { font-size: 11px; color: #999; margin-top: 4px; }
.empty { text-align: center; padding: 60px; color: #999; }
</style>

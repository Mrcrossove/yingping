<template>
  <view class="container">
    <view v-for="c in categories" :key="c.id" class="category-card" @click="goCategory(c.id)">
      <text class="category-name">{{ c.name }}</text>
      <text class="category-count">{{ c._count?.products || 0 }} 个商品</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { categoryApi } from '@/api/index'

const categories = ref<any[]>([])

async function fetchCategories() { categories.value = await categoryApi.list() }

function goCategory(id: number) { uni.reLaunch({ url: `/pages/index/index?categoryId=${id}` }) }

onMounted(fetchCategories)
</script>

<style scoped>
.container { padding: 10px; }
.category-card { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 10px; display: flex; justify-content: space-between; }
.category-name { font-size: 16px; font-weight: bold; }
.category-count { font-size: 13px; color: #999; }
</style>

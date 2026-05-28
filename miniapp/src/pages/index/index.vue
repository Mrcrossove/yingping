<template>
  <view class="container">
    <view class="search-bar">
      <input v-model="keyword" placeholder="搜索饮品..." @confirm="fetchProducts" class="search-input" />
    </view>

    <scroll-view scroll-x class="category-scroll">
      <view
        v-for="c in categories" :key="c.id"
        :class="['category-item', { active: currentCategory === c.id }]"
        @click="switchCategory(c.id)"
      >
        {{ c.name }}
      </view>
    </scroll-view>

    <view class="product-list">
      <view v-for="p in products" :key="p.id" class="product-card" @click="showDetail(p)">
        <image :src="p.image || '/static/default.png'" class="product-img" mode="aspectFill" />
        <view class="product-info">
          <text class="product-name">{{ p.name }}</text>
          <text class="product-desc">{{ p.description || '暂无描述' }}</text>
          <view class="product-bottom">
            <text class="product-price">¥{{ p.price }}</text>
            <view class="add-btn" @click.stop="addToCart(p)">+</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="products.length === 0" class="empty">
      <text>暂无商品</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { productApi, categoryApi } from '@/api/index'
import { useCartStore } from '@/stores/cart'

const cartStore = useCartStore()
const categories = ref<any[]>([])
const products = ref<any[]>([])
const currentCategory = ref<number>(0)
const keyword = ref('')

async function fetchCategories() { categories.value = await categoryApi.list() }

async function fetchProducts() {
  const params: any = {}
  if (currentCategory.value) params.categoryId = currentCategory.value
  if (keyword.value) params.keyword = keyword.value
  const data = await productApi.list(params)
  products.value = data.list
}

function switchCategory(id: number) { currentCategory.value = currentCategory.value === id ? 0 : id; fetchProducts() }

function addToCart(p: any) {
  cartStore.addItem({ productId: p.id, name: p.name, price: Number(p.price), image: p.image, quantity: 1, checked: true })
  uni.showToast({ title: '已加入购物车', icon: 'success' })
}

function showDetail(p: any) {
  uni.navigateTo({ url: `/pages/order-detail/order-detail?productId=${p.id}` })
}

onMounted(() => { fetchCategories(); fetchProducts() })
</script>

<style scoped>
.container { padding: 10px; }
.search-bar { padding: 10px 0; }
.search-input { background: #fff; border-radius: 20px; padding: 8px 16px; font-size: 14px; }
.category-scroll { white-space: nowrap; padding: 8px 0; }
.category-item { display: inline-block; padding: 6px 16px; margin-right: 10px; border-radius: 16px; background: #fff; font-size: 13px; color: #666; }
.category-item.active { background: #409EFF; color: #fff; }
.product-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.product-card { width: calc(50% - 5px); background: #fff; border-radius: 10px; overflow: hidden; }
.product-img { width: 100%; height: 180rpx; background: #f0f0f0; }
.product-info { padding: 8px; }
.product-name { font-size: 15px; font-weight: bold; }
.product-desc { font-size: 12px; color: #999; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.product-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.product-price { color: #f56c6c; font-size: 16px; font-weight: bold; }
.add-btn { width: 28px; height: 28px; background: #409EFF; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.empty { text-align: center; padding: 60px 0; color: #999; }
</style>

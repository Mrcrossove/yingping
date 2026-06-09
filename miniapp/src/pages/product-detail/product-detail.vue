<template>
  <view class="page">
    <scroll-view scroll-y class="content">
      <view class="hero">
        <image v-if="product.image" class="hero-image" :src="imageUrl(product.image)" mode="aspectFill" />
        <view v-else class="hero-placeholder">{{ product.name ? product.name[0] : '饮' }}</view>
      </view>

      <view class="summary">
        <view class="title-row">
          <text class="name">{{ product.name }}</text>
          <text class="status" :class="{ off: product.status === 0 }">{{ product.status === 1 ? '上架' : '下架' }}</text>
        </view>
        <view class="meta-row">
          <text class="price">¥{{ Number(product.price || 0).toFixed(2) }}</text>
          <text class="unit">/{{ product.unit || '杯' }}</text>
        </view>
        <view class="info-row">
          <text>{{ product.category?.name || '未分类' }}</text>
          <text>库存 {{ product.stock ?? 0 }}</text>
        </view>
      </view>

      <view v-if="product.description || product.detailDescription" class="section">
        <text class="section-title">商品介绍</text>
        <text class="desc">{{ product.detailDescription || product.description }}</text>
      </view>

      <view v-if="product.specText" class="section">
        <text class="section-title">规格说明</text>
        <text class="desc">{{ product.specText }}</text>
      </view>

      <view v-if="product.storageText" class="section">
        <text class="section-title">储存配送</text>
        <text class="desc">{{ product.storageText }}</text>
      </view>

      <view v-if="detailImages.length" class="section image-section">
        <text class="section-title">详情图片</text>
        <image v-for="(url, index) in detailImages" :key="url + index" class="detail-image" :src="imageUrl(url)" mode="widthFix" />
      </view>

      <view v-if="loading" class="empty">加载中...</view>
      <view v-if="!loading && !product.id" class="empty">商品不存在或已下架</view>
      <view class="bottom-space"></view>
    </scroll-view>

    <view v-if="product.id" class="bottom-bar">
      <view class="stepper">
        <text class="step-btn" @click="changeQty(-1)">-</text>
        <input class="step-input" type="number" :value="quantity" @input="onQtyInput" />
        <text class="step-btn" @click="changeQty(1)">+</text>
      </view>
      <view class="cart-btn" @click="addToCart">加入购物车</view>
      <view class="buy-btn" @click="goCart">去购物车</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { productApi } from '@/api/index'
import { API_BASE_URL } from '@/config'
import { useCartStore } from '@/stores/cart'

const cartStore = useCartStore()
const loading = ref(false)
const product = ref<any>({})
const quantity = ref(1)

const detailImages = computed(() => normalizeImages(product.value.detailImages))

function imageUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return API_BASE_URL + url
}

function normalizeImages(value: any) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

async function fetchProduct(id: number) {
  loading.value = true
  try {
    product.value = await productApi.detail(id)
    uni.setNavigationBarTitle({ title: product.value.name || '商品详情' })
  } catch {
    product.value = {}
  } finally {
    loading.value = false
  }
}

function changeQty(delta: number) {
  quantity.value = Math.max(1, quantity.value + delta)
}

function onQtyInput(e: any) {
  quantity.value = Math.max(1, parseInt(e.detail.value) || 1)
}

function addToCart() {
  if (!product.value.id) return false
  if (product.value.status === 0) {
    uni.showToast({ title: '商品已下架', icon: 'none' })
    return false
  }
  cartStore.addItem({
    productId: product.value.id,
    name: product.value.name,
    price: Number(product.value.price || 0),
    image: product.value.image,
    quantity: quantity.value,
    checked: true,
  })
  uni.showToast({ title: '已加入购物车', icon: 'success' })
  return true
}

function goCart() {
  if (addToCart()) uni.switchTab({ url: '/pages/cart/cart' })
}

onLoad((options: any) => {
  const id = Number(options?.id)
  if (!id) {
    uni.showToast({ title: '商品参数错误', icon: 'none' })
    return
  }
  fetchProduct(id)
})

onShareAppMessage(() => ({
  title: product.value.name || '商品详情',
  path: `/pages/product-detail/product-detail?id=${product.value.id || ''}`,
  imageUrl: product.value.image ? imageUrl(product.value.image) : undefined,
}))

onShareTimeline(() => ({
  title: product.value.name || '商品详情',
  query: product.value.id ? `id=${product.value.id}` : '',
  imageUrl: product.value.image ? imageUrl(product.value.image) : undefined,
}))
</script>

<style scoped>
.page { min-height: 100vh; background: #eef2f6; }
.content { height: 100vh; box-sizing: border-box; }
.hero { height: 320px; background: #dfe5ee; display: flex; align-items: center; justify-content: center; }
.hero-image { width: 100%; height: 100%; display: block; }
.hero-placeholder { width: 88px; height: 88px; border-radius: 18px; background: #e8f0fe; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 34px; font-weight: 800; }
.summary { margin: -18px 12px 12px; padding: 16px; background: #fff; border-radius: 12px; position: relative; box-shadow: 0 8px 24px rgba(15,23,42,0.08); }
.title-row { display: flex; align-items: flex-start; gap: 10px; }
.name { flex: 1; font-size: 20px; line-height: 27px; font-weight: 800; color: #172033; }
.status { flex-shrink: 0; font-size: 11px; color: #0f8a3c; background: #e8f7ee; border-radius: 999px; padding: 4px 8px; }
.status.off { color: #8c8c8c; background: #f1f1f1; }
.meta-row { display: flex; align-items: baseline; margin-top: 12px; }
.price { color: #dc2626; font-size: 24px; font-weight: 900; }
.unit { color: #7b8494; font-size: 13px; margin-left: 2px; }
.info-row { margin-top: 10px; display: flex; gap: 10px; color: #64748b; font-size: 12px; }
.section { margin: 12px; padding: 15px; background: #fff; border-radius: 12px; }
.section-title { display: block; font-size: 15px; font-weight: 800; color: #172033; margin-bottom: 9px; }
.desc { display: block; font-size: 14px; line-height: 22px; color: #4c5667; white-space: pre-wrap; }
.image-section { padding-bottom: 8px; }
.detail-image { width: 100%; display: block; border-radius: 10px; margin-bottom: 10px; background: #f5f7fa; }
.empty { text-align: center; color: #8c8c8c; font-size: 14px; padding: 36px 0; }
.bottom-space { height: 92px; }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -6px 20px rgba(15,23,42,0.08); display: grid; grid-template-columns: 116px 1fr 1fr; gap: 10px; align-items: center; box-sizing: border-box; }
.stepper { height: 40px; display: flex; align-items: center; border: 1px solid #d9e2ee; border-radius: 10px; overflow: hidden; background: #fff; }
.step-btn { width: 34px; height: 40px; display: flex; align-items: center; justify-content: center; color: #334155; background: #f8fafc; font-size: 16px; }
.step-input { flex: 1; height: 40px; text-align: center; font-size: 14px; border-left: 1px solid #d9e2ee; border-right: 1px solid #d9e2ee; }
.cart-btn, .buy-btn { height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: 800; }
.cart-btn { background: #172033; }
.buy-btn { background: #2563eb; }
</style>

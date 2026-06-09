<template>
  <view class="page">
    <!-- 顶部：品牌信息 -->
    <view class="header-bar">
      <view class="merchant-info">
        <text class="merchant-name">饮品下单</text>
        <text class="merchant-subtitle">公司资质与商品订购</text>
      </view>
    </view>

    <!-- 公司资质轮播 -->
    <swiper v-if="banners.length" class="banner-swiper" autoplay circular indicator-dots indicator-color="rgba(255,255,255,0.55)" indicator-active-color="#ffffff">
      <swiper-item v-for="item in banners" :key="item.id" @click="handleBannerTap(item)">
        <image class="banner-image" :src="imageUrl(item.image)" mode="aspectFill" />
        <view class="banner-caption" v-if="item.title">
          <text>{{ item.title }}</text>
        </view>
      </swiper-item>
    </swiper>
    <view v-else class="qualification-card">
      <view class="qc-copy">
        <text class="qc-title">公司资质展示</text>
        <text class="qc-desc">营业执照、食品经营许可等图片可在后台轮播图管理中上传</text>
      </view>
      <view class="qc-badge">资质</view>
    </view>

    <!-- 搜索栏：放在资质轮播下方 -->
    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索商品/SKU编号" confirm-type="search" @confirm="filterProducts" />
    </view>

    <!-- 首页内分类筛选 -->
    <scroll-view scroll-x class="category-scroll" :show-scrollbar="false">
      <view v-for="c in displayCategories" :key="c.id"
        :class="['category-tag', { active: currentCategory === c.id }]"
        @click="switchCategory(c.id)">
        <text v-if="c.icon" class="category-icon">{{ c.icon }}</text>
        <text class="category-name">{{ c.name }}</text>
        <text class="category-count" v-if="c.count !== undefined">{{ c.count }}</text>
      </view>
    </scroll-view>

    <!-- 商品列表 — B2B批发样式 -->
    <scroll-view scroll-y class="product-list" refresher-enabled @refresherrefresh="onRefresh">
      <view v-for="p in filteredProducts" :key="p.id" class="product-card" @click="goProductDetail(p.id)">
        <!-- 商品图 -->
        <view class="p-image">
          <image v-if="p.image" class="product-image" :src="imageUrl(p.image)" mode="aspectFill" />
          <view v-else class="img-placeholder">{{ p.name[0] }}</view>
          <view class="spec-tag">{{ p.spec }}</view>
        </view>
        <!-- 商品信息 -->
        <view class="p-body">
          <text class="p-name">{{ p.name }}</text>
          <!-- 阶梯价格 -->
          <view class="tier-prices">
            <view v-for="(t, i) in p.tierPrices" :key="i" class="tier-row">
              <text class="tier-qty">≥{{ t.minQty }}{{ p.unit }}</text>
              <text class="tier-price" :class="{ highlight: i === 0 }">¥{{ t.price }}/{{ p.unit }}</text>
            </view>
          </view>
          <view class="p-footer">
            <text class="min-order">{{ p.minOrderQty }}{{ p.unit }}起批</text>
            <text class="stock">库存 {{ p.stock }}</text>
          </view>
          <!-- 数量 + 加购 -->
          <view class="p-action">
            <view class="stepper">
              <text class="step-btn" @click.stop="changeQty(p.id, -1)">−</text>
              <input class="step-input" type="number" :value="getQty(p.id)" @click.stop @input="onQtyInput($event, p.id)" />
              <text class="step-btn" @click.stop="changeQty(p.id, 1)">+</text>
            </view>
            <view class="add-cart-btn" @click.stop="addToCart(p)">加入购物车</view>
          </view>
        </view>
      </view>
      <view v-if="!filteredProducts.length" class="empty-products">
        <text>{{ loadError || '暂无商品' }}</text>
      </view>
    </scroll-view>

    <!-- 底部悬浮购物车 -->
    <view class="float-cart" v-if="cartTotalCount > 0" @click="goCart">
      <view class="cart-badge">{{ cartTotalCount }}</view>
      <text class="cart-label">查看购物车</text>
      <text class="cart-amount">¥{{ cartTotal.toFixed(2) }}</text>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { bannerApi, categoryApi, productApi } from '@/api/index'
import { API_BASE_URL } from '@/config'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

const cartStore = useCartStore()
const userStore = useUserStore()
const keyword = ref('')
const currentCategory = ref(0)
const cart = ref<Record<number, number>>({})
const banners = ref<any[]>([])
const remoteCategories = ref<any[]>([])
const remoteProducts = ref<Product[]>([])
const loadError = ref('')

type Product = {
  id: number
  name: string
  categoryId: number
  categoryName: string
  image?: string
  price: number
  unit: string
  spec: string
  tierPrices: { minQty: number; price: number }[]
  minOrderQty: number
  stock: number
  description?: string
}

const categories = computed(() => remoteCategories.value)
const displayCategories = computed(() => {
  const allCount = remoteProducts.value.length
  const list = categories.value.map((item: any) => ({
    ...item,
    count: remoteProducts.value.filter(p => p.categoryId === item.id).length,
  }))
  return [{ id: 0, name: '全部', icon: '', count: allCount }, ...list]
})
const filteredProducts = computed(() => {
  let list = remoteProducts.value
  if (currentCategory.value) list = list.filter(p => p.categoryId === currentCategory.value)
  const kw = keyword.value.trim()
  if (kw) list = list.filter(p => p.name.includes(kw) || p.categoryName.includes(kw) || String(p.id).includes(kw))
  return list
})

const cartTotalCount = computed(() => Object.values(cart.value).reduce((s, v) => s + v, 0))
const cartTotal = computed(() => {
  let total = 0
  for (const [id, qty] of Object.entries(cart.value)) {
    const p = remoteProducts.value.find(x => x.id === +id)
    if (p) {
      const tier = [...p.tierPrices].reverse().find(t => qty >= t.minQty)
      total += (tier?.price || p.price) * qty
    }
  }
  return total
})

function getQty(id: number) { return cart.value[id] || 0 }
function changeQty(id: number, delta: number) {
  const cur = getQty(id)
  const next = Math.max(0, cur + delta)
  if (next === 0) delete cart.value[id]
  else cart.value[id] = next
  cart.value = { ...cart.value }
}
function onQtyInput(e: any, id: number) {
  const v = parseInt(e.detail.value) || 0
  if (v <= 0) delete cart.value[id]
  else cart.value[id] = v
  cart.value = { ...cart.value }
}
function addToCart(p: Product) {
  const qty = getQty(p.id)
  if (qty < p.minOrderQty) {
    uni.showToast({ title: `${p.minOrderQty}${p.unit}起批`, icon: 'none' })
    return
  }
  cartStore.addItem({
    productId: p.id,
    name: p.name,
    price: p.price,
    image: p.image,
    quantity: qty,
    checked: true,
  })
  delete cart.value[p.id]
  cart.value = { ...cart.value }
  uni.showToast({ title: `已加入 ${qty}${p.unit} ${p.name}`, icon: 'success' })
}
function switchCategory(id: number) { currentCategory.value = id }
function filterProducts() {}
async function fetchBanners() {
  try {
    banners.value = await bannerApi.list()
  } catch {
    banners.value = []
  }
}
async function fetchCategories() {
  try {
    const data = await categoryApi.list()
    remoteCategories.value = data.map((item: any) => ({
      id: item.id,
      name: item.name,
      icon: item.icon || '🥤',
    }))
  } catch {
    remoteCategories.value = []
  }
}
async function fetchProducts() {
  try {
    const data = await productApi.list({ pageSize: 100, status: 1 })
    loadError.value = ''
    remoteProducts.value = (data.list || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      categoryName: item.category?.name || '',
      image: item.image || '',
      price: Number(item.price || 0),
      unit: item.unit || '杯',
      spec: item.description || item.unit || '标准规格',
      tierPrices: [{ minQty: 1, price: Number(item.price || 0) }],
      minOrderQty: 1,
      stock: Number(item.stock || 0),
      description: item.description || '',
    }))
  } catch {
    remoteProducts.value = []
    loadError.value = '商品加载失败，请下拉刷新'
  }
}
function imageUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return API_BASE_URL + url
}
function handleBannerTap(item: any) {
  if (!item.link) return
  if (item.link.startsWith('/pages/')) uni.navigateTo({ url: item.link })
}
function onRefresh() {
  Promise.all([fetchBanners(), fetchCategories(), fetchProducts()]).finally(() => {
    uni.stopPullDownRefresh()
    uni.showToast({ title: '刷新成功', icon: 'success' })
  })
}
function goCart() { uni.switchTab({ url: '/pages/cart/cart' }) }
function goProductDetail(id: number) { uni.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` }) }

function shareQuery() {
  const promoterCode = uni.getStorageSync('promoterCode')
  return promoterCode ? `promoterCode=${encodeURIComponent(promoterCode)}` : ''
}

onLoad((options: any) => {
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'] as any,
  })
  userStore.capturePromoterCode({ query: options })
  const categoryId = Number(options?.categoryId)
  if (categoryId) currentCategory.value = categoryId
})
onMounted(() => {
  fetchBanners()
  fetchCategories()
  fetchProducts()
})

onShareAppMessage(() => ({
  title: '栀致饮品订货',
  path: `/pages/index/index${shareQuery() ? `?${shareQuery()}` : ''}`,
}))

onShareTimeline(() => ({
  title: '栀致饮品订货',
  query: shareQuery(),
}))
</script>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; background: #eef2f6; }
.header-bar { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px 10px; background: #ffffff; color: #172033; flex-shrink: 0; border-bottom: 1px solid #edf1f6; }
.merchant-info { display: flex; flex-direction: column; gap: 2px; }
.merchant-name { font-size: 19px; font-weight: 800; line-height: 25px; letter-spacing: 0.2px; }
.merchant-subtitle { font-size: 12px; color: #7b8494; }
.header-actions { display: flex; gap: 16px; }
.scan-btn { font-size: 20px; }
.banner-swiper { height: 158px; margin: 12px 12px 10px; border-radius: 14px; overflow: hidden; background: #dfe5ee; box-shadow: 0 10px 28px rgba(15,23,42,0.08); flex-shrink: 0; position: relative; }
.banner-image { width: 100%; height: 100%; display: block; }
.banner-caption { position: absolute; left: 12px; right: 12px; bottom: 12px; color: #fff; font-size: 14px; font-weight: 700; text-shadow: 0 1px 8px rgba(0,0,0,0.45); }
.qualification-card { height: 158px; margin: 12px 12px 10px; border-radius: 14px; box-sizing: border-box; padding: 18px; background: linear-gradient(135deg, #172033, #2563eb); color: #fff; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; overflow: hidden; box-shadow: 0 10px 28px rgba(15,23,42,0.12); }
.qc-copy { display: flex; flex-direction: column; gap: 8px; max-width: 230px; }
.qc-title { font-size: 21px; font-weight: 800; line-height: 28px; }
.qc-desc { font-size: 12px; line-height: 18px; color: rgba(255,255,255,0.82); }
.qc-badge { width: 62px; height: 62px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.42); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; background: rgba(255,255,255,0.14); }
.search-bar { padding: 0 12px 10px; background: transparent; flex-shrink: 0; }
.search-input { background: #fff; border-radius: 12px; padding: 11px 14px; font-size: 14px; box-shadow: 0 0 0 1px #e6ebf2 inset; }
.category-scroll { white-space: nowrap; padding: 0 12px 10px; background: transparent; flex-shrink: 0; box-sizing: border-box; }
.category-tag { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; margin-right: 8px; border-radius: 999px; background: #fff; font-size: 13px; color: #4c5667; transition: all 0.2s; box-shadow: 0 0 0 1px #e6ebf2 inset; }
.category-tag.active { background: #172033; color: #fff; font-weight: 700; box-shadow: none; }
.category-name { white-space: nowrap; }
.category-count { min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: #eef1f5; color: #7b8494; font-size: 10px; line-height: 16px; text-align: center; box-sizing: border-box; }
.category-tag.active .category-count { background: rgba(255,255,255,0.24); color: #fff; }
.product-list { flex: 1; padding: 0 12px 8px; box-sizing: border-box; }
.product-card { background: #fff; border-radius: 12px; margin-bottom: 10px; overflow: hidden; display: flex; align-items: stretch; box-shadow: 0 0 0 1px #e8edf4 inset; }
.p-image { width: 92px; min-height: 132px; background: #f5f7fa; position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.product-image { width: 100%; height: 100%; display: block; }
.img-placeholder { width: 44px; height: 44px; background: #e8f0fe; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #1a73e8; font-weight: bold; }
.spec-tag { position: absolute; bottom: 6px; left: 6px; right: 6px; background: rgba(0,0,0,0.62); color: #fff; font-size: 9px; padding: 2px 5px; border-radius: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-align: center; }
.p-body { flex: 1; padding: 11px 12px 10px; display: flex; flex-direction: column; min-width: 0; box-sizing: border-box; }
.p-name { font-size: 15px; font-weight: 800; color: #172033; line-height: 21px; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 6px; }
.tier-prices { width: 100%; max-width: 100%; margin-bottom: 4px; }
.tier-row { display: grid; grid-template-columns: 54px minmax(0, 1fr); column-gap: 10px; align-items: baseline; padding: 1px 0; }
.tier-qty { font-size: 10px; color: #8c8c8c; white-space: nowrap; }
.tier-price { font-size: 11px; color: #666; font-weight: 500; white-space: nowrap; text-align: left; }
.tier-price.highlight { color: #dc2626; font-weight: 800; font-size: 14px; }
.p-footer { display: flex; justify-content: flex-start; align-items: center; gap: 10px; margin-top: auto; padding-top: 2px; min-width: 0; }
.min-order { font-size: 10px; color: #dc2626; background: #fff1f2; padding: 2px 6px; border-radius: 999px; }
.stock { font-size: 10px; color: #8c8c8c; white-space: nowrap; }
.p-action { display: flex; align-items: center; margin-top: 7px; gap: 8px; min-width: 0; }
.stepper { display: flex; align-items: center; border: 1px solid #d9e2ee; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: #fff; }
.step-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #334155; background: #f8fafc; }
.step-input { width: 40px; height: 28px; text-align: center; font-size: 13px; border-left: 1px solid #d9e2ee; border-right: 1px solid #d9e2ee; }
.add-cart-btn { background: #2563eb; color: #fff; font-size: 12px; padding: 7px 11px; border-radius: 8px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.float-cart { position: fixed; bottom: 20px; left: 16px; right: 16px; background: #172033; border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; color: #fff; box-shadow: 0 12px 30px rgba(15,23,42,0.22); }
.cart-badge { background: #fff; color: #172033; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 10px; }
.cart-label { flex: 1; font-size: 15px; font-weight: 600; }
.cart-amount { font-size: 17px; font-weight: 700; }
.empty-products { text-align: center; color: #999; padding: 60px 0; font-size: 14px; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.role-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; }
.sheet-title { font-size: 16px; font-weight: 700; display: block; margin-bottom: 12px; text-align: center; }
.role-option { padding: 14px; font-size: 15px; border-radius: 10px; margin-bottom: 6px; background: #f5f6f8; }
.role-option.selected { background: #e8f0fe; color: #1a73e8; font-weight: 600; }
</style>

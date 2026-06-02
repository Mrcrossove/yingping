<template>
  <view class="page">
    <!-- 顶部：商户信息 + 扫码绑定 -->
    <view class="header-bar">
      <view class="merchant-info">
        <text class="merchant-name">喜茶（万达店）</text>
        <text class="merchant-tag">VIP商户</text>
      </view>
      <view class="header-actions">
        <text class="scan-btn" @click="showRoleSwitcher = true">🔄 角色</text>
        <text class="scan-btn">📷</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索商品/SKU编号" confirm-type="search" @confirm="filterProducts" />
    </view>

    <swiper v-if="banners.length" class="banner-swiper" autoplay circular indicator-dots indicator-color="rgba(255,255,255,0.55)" indicator-active-color="#ffffff">
      <swiper-item v-for="item in banners" :key="item.id" @click="handleBannerTap(item)">
        <image class="banner-image" :src="imageUrl(item.image)" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <!-- 分类横向滚动 -->
    <scroll-view scroll-x class="category-scroll" :show-scrollbar="false">
      <view v-for="c in categories" :key="c.id"
        :class="['category-tag', { active: currentCategory === c.id }]"
        @click="switchCategory(c.id)">{{ c.icon }} {{ c.name }}</view>
    </scroll-view>

    <!-- 商品列表 — B2B批发样式 -->
    <scroll-view scroll-y class="product-list" refresher-enabled @refresherrefresh="onRefresh">
      <view v-for="p in filteredProducts" :key="p.id" class="product-card">
        <!-- 商品图 -->
        <view class="p-image">
          <view class="img-placeholder">{{ p.name[0] }}</view>
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
              <text class="step-btn" @click="changeQty(p.id, -1)">−</text>
              <input class="step-input" type="number" :value="getQty(p.id)" @input="onQtyInput($event, p.id)" />
              <text class="step-btn" @click="changeQty(p.id, 1)">+</text>
            </view>
            <view class="add-cart-btn" @click="addToCart(p)">加入购物车</view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部悬浮购物车 -->
    <view class="float-cart" v-if="cartTotalCount > 0" @click="goCart">
      <view class="cart-badge">{{ cartTotalCount }}</view>
      <text class="cart-label">查看购物车</text>
      <text class="cart-amount">¥{{ cartTotal.toFixed(2) }}</text>
    </view>

    <!-- 业务员专属：代客录单入口 -->
    <view class="agent-entry" v-if="appStore.currentRole === 'salesperson'" @click="goManualOrder">
      <text class="agent-icon">📝</text>
      <text class="agent-text">代客录单</text>
    </view>

    <!-- 角色切换调试面板 (开发专用) -->
    <view v-if="showRoleSwitcher" class="modal-mask" @click="showRoleSwitcher = false">
      <view class="role-sheet" @click.stop>
        <text class="sheet-title">切换角色预览</text>
        <view v-for="r in roles" :key="r.value" class="role-option"
          :class="{ selected: appStore.currentRole === r.value }"
          @click="appStore.switchRole(r.value); showRoleSwitcher = false">{{ r.label }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { mockCategories, mockProducts, type Product } from '@/mock/index'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { bannerApi } from '@/api/index'
import { API_BASE_URL } from '@/config'
import { onLoad } from '@dcloudio/uni-app'

const appStore = useAppStore()
const cartStore = useCartStore()
const userStore = useUserStore()
const keyword = ref('')
const currentCategory = ref(0)
const cart = ref<Record<number, number>>({})
const showRoleSwitcher = ref(false)
const banners = ref<any[]>([])

const categories = computed(() => mockCategories)
const roles = [
  { value: 'merchant' as const, label: '🔵 商户视角' },
  { value: 'salesperson' as const, label: '🟢 业务员视角' },
  { value: 'maker' as const, label: '🟡 制作员视角' },
  { value: 'delivery' as const, label: '🟠 配送员视角' },
  { value: 'promoter' as const, label: '🟣 推广员视角' },
  { value: 'boss' as const, label: '🔴 老板/管理员' },
]

const filteredProducts = computed(() => {
  let list = mockProducts
  if (currentCategory.value) list = list.filter(p => p.categoryId === currentCategory.value)
  if (keyword.value) list = list.filter(p => p.name.includes(keyword.value) || p.categoryName.includes(keyword.value))
  return list
})

const cartTotalCount = computed(() => Object.values(cart.value).reduce((s, v) => s + v, 0))
const cartTotal = computed(() => {
  let total = 0
  for (const [id, qty] of Object.entries(cart.value)) {
    const p = mockProducts.find(x => x.id === +id)
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
  uni.showToast({ title: `已加入 ${qty}${p.unit} ${p.name}`, icon: 'success' })
}
function switchCategory(id: number) { currentCategory.value = currentCategory.value === id ? 0 : id }
function filterProducts() {}
async function fetchBanners() {
  try {
    banners.value = await bannerApi.list()
  } catch {
    banners.value = []
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
function onRefresh() { fetchBanners(); uni.showToast({ title: '刷新成功', icon: 'success' }) }
function goCart() { uni.navigateTo({ url: '/pages/cart/cart' }) }
function goManualOrder() { uni.navigateTo({ url: '/pages/cart/cart?mode=agent' }) }

onLoad((options: any) => userStore.capturePromoterCode({ query: options }))
onMounted(fetchBanners)
</script>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; background: #f5f6f8; }
.header-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px 8px; background: linear-gradient(135deg, #1a73e8, #1557b0); color: #fff; }
.merchant-name { font-size: 17px; font-weight: 700; }
.merchant-tag { font-size: 11px; background: rgba(255,255,255,0.25); padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
.header-actions { display: flex; gap: 16px; }
.scan-btn { font-size: 20px; }
.search-bar { padding: 8px 16px; background: #fff; }
.search-input { background: #f5f6f8; border-radius: 20px; padding: 10px 16px; font-size: 14px; }
.banner-swiper { height: 170px; margin: 10px 12px 8px; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 1px 4px rgba(20,31,51,0.05); flex-shrink: 0; }
.banner-image { width: 100%; height: 100%; display: block; }
.category-scroll { white-space: nowrap; padding: 10px 16px; background: #fff; flex-shrink: 0; }
.category-tag { display: inline-block; padding: 7px 14px; margin-right: 8px; border-radius: 18px; background: #f0f2f5; font-size: 13px; color: #555; transition: all 0.2s; }
.category-tag.active { background: #1a73e8; color: #fff; font-weight: 600; }
.product-list { flex: 1; padding: 8px 12px; box-sizing: border-box; }
.product-card { background: #fff; border-radius: 10px; margin-bottom: 10px; overflow: hidden; display: flex; align-items: stretch; box-shadow: 0 1px 4px rgba(20, 31, 51, 0.04); }
.p-image { width: 88px; min-height: 128px; background: #f5f6f8; position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.img-placeholder { width: 44px; height: 44px; background: #e8f0fe; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #1a73e8; font-weight: bold; }
.spec-tag { position: absolute; bottom: 6px; left: 6px; right: 6px; background: rgba(0,0,0,0.62); color: #fff; font-size: 9px; padding: 2px 5px; border-radius: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-align: center; }
.p-body { flex: 1; padding: 9px 10px 9px 10px; display: flex; flex-direction: column; min-width: 0; box-sizing: border-box; }
.p-name { font-size: 14px; font-weight: 700; color: #1a1a1a; line-height: 20px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 6px; }
.tier-prices { width: 142px; max-width: 100%; margin-bottom: 4px; }
.tier-row { display: grid; grid-template-columns: 48px 1fr; column-gap: 10px; align-items: baseline; padding: 1px 0; }
.tier-qty { font-size: 10px; color: #8c8c8c; white-space: nowrap; }
.tier-price { font-size: 11px; color: #666; font-weight: 500; white-space: nowrap; text-align: left; }
.tier-price.highlight { color: #e8453c; font-weight: 800; font-size: 13px; }
.p-footer { display: flex; justify-content: flex-start; align-items: center; gap: 10px; margin-top: auto; padding-top: 2px; min-width: 0; }
.min-order { font-size: 10px; color: #e8453c; background: #fff0f0; padding: 1px 5px; border-radius: 3px; }
.stock { font-size: 10px; color: #8c8c8c; white-space: nowrap; }
.p-action { display: flex; align-items: center; margin-top: 7px; gap: 8px; min-width: 0; }
.stepper { display: flex; align-items: center; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden; flex-shrink: 0; }
.step-btn { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #555; background: #f9f9f9; }
.step-input { width: 38px; height: 26px; text-align: center; font-size: 13px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; }
.add-cart-btn { background: #1a73e8; color: #fff; font-size: 12px; padding: 6px 10px; border-radius: 5px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.float-cart { position: fixed; bottom: 20px; left: 16px; right: 16px; background: linear-gradient(135deg, #1a73e8, #1557b0); border-radius: 12px; padding: 14px 20px; display: flex; align-items: center; color: #fff; box-shadow: 0 4px 20px rgba(26,115,232,0.4); }
.cart-badge { background: #fff; color: #1a73e8; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 10px; }
.cart-label { flex: 1; font-size: 15px; font-weight: 600; }
.cart-amount { font-size: 17px; font-weight: 700; }
.agent-entry { position: fixed; bottom: 90px; right: 16px; background: #52c41a; border-radius: 50px; padding: 10px 18px; display: flex; align-items: center; gap: 6px; color: #fff; box-shadow: 0 4px 12px rgba(82,196,26,0.4); font-size: 14px; font-weight: 600; }
.agent-icon { font-size: 18px; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.role-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; }
.sheet-title { font-size: 16px; font-weight: 700; display: block; margin-bottom: 12px; text-align: center; }
.role-option { padding: 14px; font-size: 15px; border-radius: 10px; margin-bottom: 6px; background: #f5f6f8; }
.role-option.selected { background: #e8f0fe; color: #1a73e8; font-weight: 600; }
</style>

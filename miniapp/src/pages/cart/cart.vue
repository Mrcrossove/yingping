<template>
  <view class="container">
    <block v-if="items.length > 0">
      <view v-for="item in items" :key="item.productId" class="cart-item">
        <view class="checkbox" @click="cartStore.toggleCheck(item.productId)">
          <text :style="{ color: item.checked ? '#409EFF' : '#ccc', fontSize: '22px' }">{{ item.checked ? '✓' : '○' }}</text>
        </view>
        <image :src="item.image || '/static/tab/home.png'" class="cart-img" mode="aspectFill" />
        <view class="cart-info">
          <text class="cart-name">{{ item.name }}</text>
          <text class="cart-price">¥{{ item.price }}</text>
        </view>
        <view class="quantity-ctrl">
          <view class="qty-btn" @click="cartStore.updateQuantity(item.productId, item.quantity - 1)">-</view>
          <text class="qty-num">{{ item.quantity }}</text>
          <view class="qty-btn" @click="cartStore.updateQuantity(item.productId, item.quantity + 1)">+</view>
        </view>
      </view>

      <view class="order-card" @click="goAddress">
        <view class="card-title">收货地址</view>
        <view v-if="selectedAddress" class="address-content">
          <text class="address-name">{{ selectedAddress.name }} {{ selectedAddress.phone }}</text>
          <text v-if="selectedAddress.locationName" class="address-location">{{ selectedAddress.locationName }}</text>
          <text class="address-detail">{{ formatAddress(selectedAddress) }}</text>
        </view>
        <view v-else class="address-empty">请选择收货地址</view>
      </view>

      <view class="order-card">
        <view class="card-title">订单备注</view>
        <textarea v-model="note" class="note-input" placeholder="口味、配送等要求可填写在这里" />
      </view>

      <view class="cart-footer">
        <view class="footer-left">
          <text>合计: </text>
          <text class="total-price">¥{{ cartStore.totalPrice.toFixed(2) }}</text>
        </view>
        <button class="submit-btn" :disabled="cartStore.totalCount === 0" @click="handleSubmit">
          下单({{ cartStore.totalCount }})
        </button>
      </view>
    </block>
    <view v-else class="empty">
      <text>购物车是空的</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { addressApi, orderApi } from '@/api/index'

const cartStore = useCartStore()
const userStore = useUserStore()
const items = computed(() => cartStore.items)
const addresses = ref<any[]>([])
const selectedAddress = ref<any>(null)
const note = ref('')

async function fetchAddresses() {
  if (!userStore.isLoggedIn) return
  try {
    addresses.value = await addressApi.list()
    selectedAddress.value = addresses.value.find((item) => item.isDefault) || addresses.value[0] || null
  } catch {
    addresses.value = []
    selectedAddress.value = null
  }
}

function formatAddress(address: any) {
  return [address.province, address.city, address.district, address.detail].filter(Boolean).join('') || address.detail || ''
}

function goAddress() {
  uni.navigateTo({ url: '/pages/address/address' })
}

async function handleSubmit() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  const checkedItems = cartStore.getCheckedItems()
  if (checkedItems.length === 0) {
    uni.showToast({ title: '请选择商品', icon: 'none' })
    return
  }
  if (!selectedAddress.value) {
    uni.showToast({ title: '请先选择收货地址', icon: 'none' })
    return
  }
  try {
    await orderApi.create({
      items: checkedItems,
      addressId: selectedAddress.value.id,
      note: note.value,
    })
    uni.showToast({ title: '下单成功', icon: 'success' })
    cartStore.clear()
    note.value = ''
    setTimeout(() => uni.navigateTo({ url: '/pages/orders/orders' }), 1000)
  } catch { }
}

onShow(fetchAddresses)
</script>

<style scoped>
.container { min-height: 100vh; padding: 10px 12px 120rpx; box-sizing: border-box; background: #eef2f6; }
.cart-item { display: flex; align-items: center; padding: 12px; background: #fff; margin-bottom: 10px; border-radius: 12px; box-shadow: 0 0 0 1px #e8edf4 inset; }
.checkbox { margin-right: 10px; }
.cart-img { width: 88rpx; height: 88rpx; border-radius: 10px; background: #f5f7fa; margin-right: 10px; }
.cart-info { flex: 1; }
.cart-name { font-size: 15px; font-weight: 800; color: #172033; }
.cart-price { color: #dc2626; font-size: 14px; margin-top: 4px; font-weight: 700; }
.quantity-ctrl { display: flex; align-items: center; gap: 8px; }
.qty-btn { width: 30px; height: 30px; background: #f8fafc; border: 1px solid #d9e2ee; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #334155; }
.qty-num { font-size: 15px; min-width: 20px; text-align: center; }
.order-card { background: #fff; margin: 10px 0; padding: 14px; border-radius: 12px; box-shadow: 0 0 0 1px #e8edf4 inset; }
.card-title { font-size: 15px; font-weight: 800; margin-bottom: 8px; color: #172033; }
.address-content { display: flex; flex-direction: column; gap: 4px; }
.address-name { font-size: 14px; font-weight: 600; color: #333; }
.address-location { font-size: 14px; font-weight: 800; color: #172033; }
.address-detail { font-size: 13px; color: #666; line-height: 1.5; }
.address-empty { color: #999; font-size: 13px; }
.note-input { width: 100%; min-height: 76px; box-sizing: border-box; border: 1px solid #d9e2ee; border-radius: 10px; padding: 10px; font-size: 14px; background: #fbfcfe; }
.cart-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: rgba(255,255,255,0.96); border-top: 1px solid #e6ebf2; box-shadow: 0 -10px 24px rgba(15,23,42,0.06); }
.total-price { color: #dc2626; font-size: 19px; font-weight: 800; }
.submit-btn { background: #2563eb; color: #fff; border: none; border-radius: 12px; padding: 10px 28px; font-size: 15px; font-weight: 700; }
.submit-btn[disabled] { opacity: 0.5; }
.empty { text-align: center; margin: 90px 12px 0; padding: 54px 20px; color: #7b8494; background: #fff; border-radius: 14px; box-shadow: 0 0 0 1px #e8edf4 inset; }
</style>

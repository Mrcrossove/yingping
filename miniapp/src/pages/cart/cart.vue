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
  return [address.province, address.city, address.district, address.detail].filter(Boolean).join('')
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
.container { padding-bottom: 120rpx; }
.cart-item { display: flex; align-items: center; padding: 12px; background: #fff; margin-bottom: 8px; border-radius: 8px; }
.checkbox { margin-right: 10px; }
.cart-img { width: 80rpx; height: 80rpx; border-radius: 8px; background: #f0f0f0; margin-right: 10px; }
.cart-info { flex: 1; }
.cart-name { font-size: 15px; font-weight: bold; }
.cart-price { color: #f56c6c; font-size: 14px; margin-top: 4px; }
.quantity-ctrl { display: flex; align-items: center; gap: 8px; }
.qty-btn { width: 30px; height: 30px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.qty-num { font-size: 15px; min-width: 20px; text-align: center; }
.order-card { background: #fff; margin: 8px 0; padding: 14px; border-radius: 8px; }
.card-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; color: #333; }
.address-content { display: flex; flex-direction: column; gap: 4px; }
.address-name { font-size: 14px; font-weight: 600; color: #333; }
.address-detail { font-size: 13px; color: #666; line-height: 1.5; }
.address-empty { color: #999; font-size: 13px; }
.note-input { width: 100%; min-height: 72px; box-sizing: border-box; border: 1px solid #eee; border-radius: 8px; padding: 10px; font-size: 14px; }
.cart-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: #fff; border-top: 1px solid #eee; }
.total-price { color: #f56c6c; font-size: 18px; font-weight: bold; }
.submit-btn { background: #409EFF; color: #fff; border: none; border-radius: 20px; padding: 10px 30px; font-size: 15px; }
.submit-btn[disabled] { opacity: 0.5; }
.empty { text-align: center; padding: 100px 0; color: #999; }
</style>

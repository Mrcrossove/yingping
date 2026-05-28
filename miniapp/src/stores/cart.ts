interface CartItem {
  productId: number
  name: string
  price: number
  image?: string
  quantity: number
  checked: boolean
}

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>(uni.getStorageSync('cart') || [])

  const totalPrice = computed(() =>
    items.value.filter((i) => i.checked).reduce((s, i) => s + i.price * i.quantity, 0)
  )
  const totalCount = computed(() =>
    items.value.filter((i) => i.checked).reduce((s, i) => s + i.quantity, 0)
  )

  function save() { uni.setStorageSync('cart', items.value) }

  function addItem(item: CartItem) {
    const found = items.value.find((i) => i.productId === item.productId)
    if (found) { found.quantity += item.quantity } else { items.value.push({ ...item, checked: true }) }
    save()
  }

  function updateQuantity(productId: number, quantity: number) {
    const item = items.value.find((i) => i.productId === productId)
    if (item) { item.quantity = Math.max(1, quantity); save() }
  }

  function toggleCheck(productId: number, val?: boolean) {
    const item = items.value.find((i) => i.productId === productId)
    if (item) { item.checked = val !== undefined ? val : !item.checked; save() }
  }

  function removeItem(productId: number) {
    items.value = items.value.filter((i) => i.productId !== productId)
    save()
  }

  function clear() { items.value = []; save() }

  function getCheckedItems() {
    return items.value.filter((i) => i.checked).map((i) => ({
      productId: i.productId, quantity: i.quantity,
    }))
  }

  return { items, totalPrice, totalCount, addItem, updateQuantity, toggleCheck, removeItem, clear, getCheckedItems, save }
})

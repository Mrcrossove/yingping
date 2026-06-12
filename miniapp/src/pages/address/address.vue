<template>
  <view class="container">
    <view v-for="addr in addresses" :key="addr.id" class="addr-card" :class="{ default: addr.isDefault }">
      <view class="addr-top">
        <text class="addr-name">{{ addr.name }}</text>
        <text class="addr-phone">{{ addr.phone }}</text>
        <text class="addr-tag" v-if="addr.isDefault">默认</text>
      </view>
      <text class="addr-location" v-if="addr.locationName">{{ addr.locationName }}</text>
      <text class="addr-detail">{{ formatAddress(addr) }}</text>
      <view class="addr-actions">
        <text class="aa-link" @click="editAddr(addr)">编辑</text>
        <text class="aa-link danger" @click="delAddr(addr.id)">删除</text>
        <text class="aa-link" v-if="!addr.isDefault" @click="setDefault(addr.id)">设为默认</text>
      </view>
    </view>

    <view class="add-btn" @click="editAddr(null)">+ 添加收货地址</view>

    <!-- 弹窗 -->
    <view v-if="showForm" class="modal-mask" @click="showForm = false">
      <view class="form-box" @click.stop>
        <text class="form-title">{{ editingAddr ? '编辑地址' : '新增地址' }}</text>
        <input v-model="form.name" placeholder="收货人姓名" class="form-input" />
        <input v-model="form.phone" placeholder="手机号" class="form-input" />
        <view class="location-picker" @click="chooseMapLocation">
          <view class="location-main">
            <text class="location-title">{{ form.locationName || '地图选点' }}</text>
            <text class="location-sub">{{ mapAddressText || '请选择店铺、小区、写字楼等准确位置' }}</text>
          </view>
          <text class="location-action">选择</text>
        </view>
        <picker mode="region" :value="regionValue" @change="handleRegionChange">
          <view class="region-picker">{{ regionText || '省/市/区（可选，地图解析不准时可手动修正）' }}</view>
        </picker>
        <input v-model="form.detail" placeholder="门牌号 / 楼层 / 档口号" class="form-input" />
        <view class="form-btns">
          <button class="fb-cancel" @click="showForm = false">取消</button>
          <button class="fb-save" @click="saveAddr">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post, put, del } from '@/utils/request'
import { locationApi } from '@/api/index'

const addresses = ref<any[]>([])
const showForm = ref(false)
const editingAddr = ref<any>(null)
const form = reactive({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  locationName: '',
  latitude: null as number | null,
  longitude: null as number | null,
  adcode: '',
  mapAddress: '',
})
const regionValue = computed(() => [form.province, form.city, form.district].filter(Boolean))
const regionText = computed(() => [form.province, form.city, form.district].filter(Boolean).join(' / '))
const mapAddressText = computed(() => form.mapAddress || [form.province, form.city, form.district].filter(Boolean).join(''))

async function fetchList() {
  try { addresses.value = await get('/addresses') } catch { addresses.value = [] }
}

function editAddr(addr: any) {
  if (addr) {
    Object.assign(form, {
      name: addr.name || '',
      phone: addr.phone || '',
      province: addr.province || '',
      city: addr.city || '',
      district: addr.district || '',
      detail: addr.detail || '',
      locationName: addr.locationName || '',
      latitude: addr.latitude == null ? null : Number(addr.latitude),
      longitude: addr.longitude == null ? null : Number(addr.longitude),
      adcode: addr.adcode || '',
      mapAddress: formatRegionAddress(addr),
    })
    editingAddr.value = addr
  } else {
    resetForm()
    editingAddr.value = null
  }
  showForm.value = true
}

async function saveAddr() {
  if (!form.name || !form.phone || form.latitude == null || form.longitude == null || !form.detail) {
    uni.showToast({ title: '请填写姓名、手机号、地图位置和门牌号', icon: 'none' })
    return
  }
  const payload = {
    name: form.name,
    phone: form.phone,
    province: form.province,
    city: form.city,
    district: form.district,
    detail: form.detail,
    locationName: form.locationName,
    latitude: form.latitude,
    longitude: form.longitude,
    adcode: form.adcode,
  }
  if (editingAddr.value) { await put(`/addresses/${editingAddr.value.id}`, payload) }
  else { await post('/addresses', payload) }
  showForm.value = false; fetchList()
}

function resetForm() {
  Object.assign(form, {
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    locationName: '',
    latitude: null,
    longitude: null,
    adcode: '',
    mapAddress: '',
  })
}

async function chooseMapLocation() {
  try {
    const location = await uni.chooseLocation()
    form.locationName = location.name || ''
    form.latitude = Number(location.latitude)
    form.longitude = Number(location.longitude)
    form.mapAddress = location.address || ''
    await fillAddressByLocation(form.latitude, form.longitude, location.address || '')
  } catch (error: any) {
    if (error?.errMsg?.includes('cancel')) return
    uni.showToast({ title: '地图选点失败', icon: 'none' })
  }
}

async function fillAddressByLocation(latitude: number, longitude: number, fallbackAddress: string) {
  try {
    const data = await locationApi.reverseGeocode({ latitude, longitude })
    form.province = data.province || form.province
    form.city = data.city || form.city
    form.district = data.district || form.district
    form.adcode = data.adcode || ''
    form.mapAddress = data.recommend || data.address || fallbackAddress
    if (!form.locationName) form.locationName = data.recommend || data.address || ''
  } catch {
    uni.showToast({ title: '地址解析失败，可继续填写门牌号保存', icon: 'none' })
  }
}

function handleRegionChange(e: any) {
  const [province, city, district] = e.detail.value
  form.province = province
  form.city = city
  form.district = district
}

async function delAddr(id: number) {
  await del(`/addresses/${id}`); fetchList()
}

async function setDefault(id: number) {
  await post(`/addresses/${id}/default`); fetchList()
}

function formatRegionAddress(address: any) {
  return [address.province, address.city, address.district].filter(Boolean).join('')
}

function formatAddress(address: any) {
  return [address.province, address.city, address.district, address.detail].filter(Boolean).join('') || address.detail || ''
}

onShow(fetchList)
</script>

<style scoped>
.container { min-height: 100vh; padding: 10px; box-sizing: border-box; background: #f4f7f2; }
.addr-card { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.addr-card.default { border: 1px solid #2f8a5a; }
.addr-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.addr-name { font-size: 16px; font-weight: 700; }
.addr-phone { font-size: 14px; color: #666; }
.addr-tag { font-size: 10px; background: #2f8a5a; color: #fff; padding: 2px 6px; border-radius: 4px; }
.addr-location { display: block; font-size: 14px; font-weight: 700; color: #222; margin-bottom: 4px; }
.addr-detail { font-size: 13px; color: #666; margin-bottom: 8px; }
.addr-actions { display: flex; gap: 16px; }
.aa-link { font-size: 13px; color: #2f8a5a; }
.aa-link.danger { color: #f56c6c; }
.add-btn { background: #fff; border-radius: 10px; padding: 14px; text-align: center; color: #2f8a5a; font-weight: 600; font-size: 15px; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.form-box { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; max-height: 80vh; overflow-y: auto; }
.form-title { font-size: 17px; font-weight: 700; display: block; margin-bottom: 16px; text-align: center; }
.form-input { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 14px; }
.location-picker { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #f8fafc; }
.location-main { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.location-title { font-size: 15px; font-weight: 700; color: #1f2937; }
.location-sub { font-size: 12px; color: #6b7280; line-height: 1.4; }
.location-action { font-size: 13px; color: #2f8a5a; font-weight: 700; white-space: nowrap; }
.region-picker { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 14px; color: #333; }
.form-btns { display: flex; gap: 12px; margin-top: 16px; }
.fb-cancel { flex: 1; background: #f5f5f5; color: #666; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
.fb-save { flex: 1; background: #2f8a5a; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
</style>

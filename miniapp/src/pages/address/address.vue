<template>
  <view class="container">
    <view v-for="addr in addresses" :key="addr.id" class="addr-card" :class="{ default: addr.isDefault }">
      <view class="addr-top">
        <text class="addr-name">{{ addr.name }}</text>
        <text class="addr-phone">{{ addr.phone }}</text>
        <text class="addr-tag" v-if="addr.isDefault">默认</text>
      </view>
      <text class="addr-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }} {{ addr.detail }}</text>
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
        <picker mode="region" :value="regionValue" @change="handleRegionChange">
          <view class="region-picker">{{ regionText || '请选择省/市/区' }}</view>
        </picker>
        <input v-model="form.detail" placeholder="详细地址" class="form-input" />
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

const addresses = ref<any[]>([])
const showForm = ref(false)
const editingAddr = ref<any>(null)
const form = reactive({ name: '', phone: '', province: '', city: '', district: '', detail: '' })
const regionValue = computed(() => [form.province, form.city, form.district].filter(Boolean))
const regionText = computed(() => [form.province, form.city, form.district].filter(Boolean).join(' / '))

async function fetchList() {
  try { addresses.value = await get('/addresses') } catch { addresses.value = [] }
}

function editAddr(addr: any) {
  if (addr) { Object.assign(form, addr); editingAddr.value = addr }
  else { Object.assign(form, { name: '', phone: '', province: '', city: '', district: '', detail: '' }); editingAddr.value = null }
  showForm.value = true
}

async function saveAddr() {
  if (!form.name || !form.phone || !form.province || !form.city || !form.district || !form.detail) { uni.showToast({ title: '请填写完整信息', icon: 'none' }); return }
  if (editingAddr.value) { await put(`/addresses/${editingAddr.value.id}`, form) }
  else { await post('/addresses', form) }
  showForm.value = false; fetchList()
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

onShow(fetchList)
</script>

<style scoped>
.container { padding: 10px; }
.addr-card { background: #fff; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.addr-card.default { border: 1px solid #1a73e8; }
.addr-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.addr-name { font-size: 16px; font-weight: 700; }
.addr-phone { font-size: 14px; color: #666; }
.addr-tag { font-size: 10px; background: #1a73e8; color: #fff; padding: 2px 6px; border-radius: 4px; }
.addr-detail { font-size: 13px; color: #666; margin-bottom: 8px; }
.addr-actions { display: flex; gap: 16px; }
.aa-link { font-size: 13px; color: #1a73e8; }
.aa-link.danger { color: #f56c6c; }
.add-btn { background: #fff; border-radius: 10px; padding: 14px; text-align: center; color: #1a73e8; font-weight: 600; font-size: 15px; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.form-box { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; max-height: 80vh; overflow-y: auto; }
.form-title { font-size: 17px; font-weight: 700; display: block; margin-bottom: 16px; text-align: center; }
.form-input { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 14px; }
.region-picker { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 14px; color: #333; }
.form-btns { display: flex; gap: 12px; margin-top: 16px; }
.fb-cancel { flex: 1; background: #f5f5f5; color: #666; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
.fb-save { flex: 1; background: #1a73e8; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
</style>

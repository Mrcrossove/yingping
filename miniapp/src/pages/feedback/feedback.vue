<template>
  <view class="page">
    <view class="hero">
      <view class="hero-copy">
        <text class="hero-kicker">商户反馈</text>
        <text class="hero-title">把建议直接告诉我们</text>
        <text class="hero-desc">商品、配送、系统体验都可以提交，处理结果会同步在这里。</text>
      </view>
      <view class="hero-mark">
        <text>建议</text>
      </view>
    </view>

    <view v-if="!userLoggedIn" class="login-card">
      <text class="login-title">登录后提交反馈</text>
      <text class="login-desc">请先到“我的”页面登录商户账号，再回来填写建议。</text>
      <button class="login-btn" @click="goMine">去登录</button>
    </view>

    <view v-else class="form-card">
      <view class="section-head">
        <text>填写反馈</text>
        <text>{{ form.content.length }}/500</text>
      </view>

      <view class="category-grid">
        <view
          v-for="item in categories"
          :key="item.value"
          :class="['category-item', { active: form.category === item.value }]"
          @click="form.category = item.value"
        >
          <text class="category-icon">{{ item.icon }}</text>
          <text>{{ item.label }}</text>
        </view>
      </view>

      <input v-model="form.title" class="field-input" maxlength="100" placeholder="标题，例如：希望增加冰饮规格" />
      <textarea
        v-model="form.content"
        class="field-textarea"
        maxlength="500"
        placeholder="请描述你的建议或遇到的问题，越具体越方便处理"
      />
      <input v-model="form.contactPhone" class="field-input" type="number" maxlength="20" placeholder="联系电话（选填）" />
      <button class="submit-btn" :loading="submitting" @click="handleSubmit">提交反馈</button>
    </view>

    <view v-if="userLoggedIn" class="history-section">
      <view class="section-head">
        <text>我的反馈</text>
        <text @click="fetchMyFeedback">刷新</text>
      </view>

      <view v-if="loading" class="empty-card">加载中...</view>
      <view v-else-if="feedbacks.length === 0" class="empty-card">暂无反馈记录</view>
      <view v-else class="feedback-list">
        <view v-for="item in feedbacks" :key="item.id" class="feedback-card">
          <view class="feedback-top">
            <text class="feedback-title">{{ item.title }}</text>
            <text :class="['status-tag', item.status]">{{ statusMap[item.status] || item.status }}</text>
          </view>
          <text class="feedback-meta">{{ categoryMap[item.category] || item.category }} · {{ formatTime(item.createdAt) }}</text>
          <text class="feedback-content">{{ item.content }}</text>
          <view v-if="item.reply" class="reply-box">
            <text class="reply-label">后台回复</text>
            <text class="reply-content">{{ item.reply }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { feedbackApi } from '@/api/index'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const submitting = ref(false)
const loading = ref(false)
const feedbacks = ref<any[]>([])
const form = ref({
  category: 'suggestion',
  title: '',
  content: '',
  contactPhone: '',
})

const userLoggedIn = computed(() => userStore.isLoggedIn)

const categories = [
  { value: 'suggestion', label: '经营建议', icon: '💡' },
  { value: 'product', label: '商品建议', icon: '🥤' },
  { value: 'service', label: '配送服务', icon: '🚚' },
  { value: 'system', label: '系统问题', icon: '⚙️' },
  { value: 'other', label: '其他', icon: '✍️' },
]
const categoryMap: Record<string, string> = Object.fromEntries(categories.map(item => [item.value, item.label]))
const statusMap: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  rejected: '不采纳',
}

async function handleSubmit() {
  const title = form.value.title.trim()
  const content = form.value.content.trim()
  if (!title) {
    uni.showToast({ title: '请填写反馈标题', icon: 'none' })
    return
  }
  if (!content) {
    uni.showToast({ title: '请填写反馈内容', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await feedbackApi.create({
      category: form.value.category,
      title,
      content,
      contactPhone: form.value.contactPhone.trim() || undefined,
    })
    uni.showToast({ title: '提交成功', icon: 'success' })
    form.value = { category: 'suggestion', title: '', content: '', contactPhone: '' }
    fetchMyFeedback()
  } finally {
    submitting.value = false
  }
}

async function fetchMyFeedback() {
  if (!userLoggedIn.value) return
  loading.value = true
  try {
    const data = await feedbackApi.my({ page: 1, pageSize: 20 })
    feedbacks.value = data.list || []
  } finally {
    loading.value = false
  }
}

function goMine() {
  uni.switchTab({ url: '/pages/mine/mine' })
}

function formatTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

onShow(() => {
  userStore.checkLogin()
  fetchMyFeedback()
})

onPullDownRefresh(() => {
  fetchMyFeedback().finally(() => uni.stopPullDownRefresh())
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f4f7f2; color: #1f3527; }
.hero {
  position: relative;
  margin: 0 0 12px;
  padding: 24px 18px 28px;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(135deg, #1f3527 0%, #2f8a5a 62%, #d89a42 100%);
}
.hero::after {
  position: absolute;
  right: -26px;
  bottom: -34px;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  content: "";
  border: 1px solid rgba(255,255,255,0.28);
  animation: pulse-ring 4s ease-in-out infinite;
}
.hero-copy { max-width: 245px; display: flex; flex-direction: column; gap: 6px; animation: rise-in 360ms ease-out both; }
.hero-kicker { font-size: 12px; color: rgba(255,255,255,0.72); }
.hero-title { font-size: 22px; font-weight: 800; line-height: 30px; }
.hero-desc { font-size: 13px; line-height: 20px; color: rgba(255,255,255,0.82); }
.hero-mark {
  position: absolute;
  right: 18px;
  top: 26px;
  width: 62px;
  height: 62px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.26);
  font-size: 15px;
  font-weight: 800;
  animation: float-mark 3s ease-in-out infinite;
}
.login-card,
.form-card,
.history-section {
  margin: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #fffdf8;
  box-shadow: 0 8px 24px rgba(47, 80, 54, 0.08);
}
.login-title { display: block; font-size: 17px; font-weight: 800; margin-bottom: 6px; }
.login-desc { display: block; color: #6b7f6f; font-size: 13px; line-height: 20px; margin-bottom: 14px; }
.login-btn,
.submit-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  color: #fff;
  background: #2f8a5a;
  font-size: 15px;
  font-weight: 800;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #6b7f6f;
  font-size: 12px;
}
.section-head text:first-child { color: #1f3527; font-size: 17px; font-weight: 800; }
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.category-item {
  min-height: 54px;
  border-radius: 10px;
  background: #f5f7f1;
  color: #526357;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  border: 1px solid #e4eadf;
}
.category-item.active {
  color: #fff;
  background: #2f8a5a;
  border-color: #2f8a5a;
}
.category-icon { font-size: 17px; }
.field-input,
.field-textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 10px;
  border-radius: 10px;
  background: #f7faf5;
  border: 1px solid #e2e8de;
  color: #1f3527;
  font-size: 14px;
}
.field-input { height: 44px; padding: 0 12px; }
.field-textarea { height: 128px; padding: 12px; line-height: 20px; }
.feedback-list { display: flex; flex-direction: column; gap: 10px; }
.feedback-card {
  padding: 13px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e8eee3;
}
.feedback-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.feedback-title {
  min-width: 0;
  color: #1f3527;
  font-size: 15px;
  font-weight: 800;
  line-height: 21px;
  word-break: break-word;
}
.status-tag {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: #fff4df;
  color: #9a5d16;
}
.status-tag.processing { background: #e8f1ff; color: #2563a7; }
.status-tag.resolved { background: #e7f2e9; color: #2f8a5a; }
.status-tag.rejected { background: #eef1f5; color: #697386; }
.feedback-meta {
  display: block;
  color: #879487;
  font-size: 12px;
  margin-bottom: 8px;
}
.feedback-content {
  display: block;
  color: #435349;
  font-size: 13px;
  line-height: 20px;
  word-break: break-word;
}
.reply-box {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #f4f7f2;
}
.reply-label {
  display: block;
  color: #2f8a5a;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 4px;
}
.reply-content {
  display: block;
  color: #435349;
  font-size: 13px;
  line-height: 20px;
}
.empty-card {
  padding: 24px 0;
  color: #879487;
  text-align: center;
  font-size: 14px;
}
.bottom-space { height: 34px; }

@keyframes rise-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes float-mark {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes pulse-ring {
  0%, 100% { transform: scale(1); opacity: 0.65; }
  50% { transform: scale(1.08); opacity: 0.35; }
}
</style>

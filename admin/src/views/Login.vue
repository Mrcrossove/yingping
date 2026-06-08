<template>
  <div class="login-container">
    <div class="background-layer">
      <span class="soft-shape shape-one"></span>
      <span class="soft-shape shape-two"></span>
      <span class="soft-shape shape-three"></span>
      <div class="grain"></div>
    </div>

    <div class="login-shell">
      <section class="brand-panel">
        <div class="brand-mark">栀</div>
        <p class="eyebrow">Zhizhi Beverage</p>
        <h1>栀致饮品</h1>
        <p class="brand-copy">订单、商品、员工与收益统一管理，让门店运营更清晰。</p>
        <div class="brand-stats">
          <div>
            <strong>Order</strong>
            <span>实时订单流转</span>
          </div>
          <div>
            <strong>Team</strong>
            <span>员工协同管理</span>
          </div>
          <div>
            <strong>Profit</strong>
            <span>收益提成追踪</span>
          </div>
        </div>
      </section>

      <section class="login-card">
        <div class="card-header">
          <span>管理后台</span>
          <h2>欢迎回来</h2>
        </div>
        <el-form :model="form" :rules="rules" ref="formRef" size="large">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="请输入账号" prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" show-password />
          </el-form-item>
          <el-form-item>
            <el-button class="login-button" type="primary" :loading="loading" @click="handleLogin">
              登录
            </el-button>
          </el-form-item>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { getHomePath } from '@/utils/access'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const data = await authApi.login(form)
    userStore.setLogin(data)
    ElMessage.success('登录成功')
    router.push(getHomePath(data.user.role))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 213, 137, 0.5), transparent 28%),
    radial-gradient(circle at 82% 28%, rgba(111, 180, 143, 0.28), transparent 30%),
    linear-gradient(135deg, #fff8ec 0%, #f2f7f1 48%, #e9f0ea 100%);
}

.background-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.soft-shape {
  position: absolute;
  display: block;
  border-radius: 999px;
  filter: blur(4px);
  opacity: 0.66;
  animation: floatShape 13s ease-in-out infinite;
}

.shape-one {
  width: 230px;
  height: 230px;
  left: 7%;
  top: 12%;
  background: rgba(244, 176, 88, 0.3);
}

.shape-two {
  width: 310px;
  height: 310px;
  right: 8%;
  top: 11%;
  background: rgba(86, 151, 115, 0.2);
  animation-delay: -4s;
}

.shape-three {
  width: 180px;
  height: 180px;
  right: 22%;
  bottom: 9%;
  background: rgba(231, 119, 71, 0.14);
  animation-delay: -8s;
}

.grain {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(74, 58, 38, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 58, 38, 0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.72), transparent 92%);
}

.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(320px, 520px) 420px;
  gap: 56px;
  width: min(1040px, 100%);
  align-items: center;
  animation: enter 580ms ease-out both;
}

.brand-panel {
  color: #26382c;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin-bottom: 26px;
  border-radius: 18px;
  color: #fff;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(145deg, #2f8a5a, #d79a43);
  box-shadow: 0 18px 42px rgba(77, 111, 74, 0.26);
}

.eyebrow {
  margin: 0 0 12px;
  color: #6b7f6f;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.brand-panel h1 {
  margin: 0;
  color: #1f3527;
  font-size: 56px;
  line-height: 1.08;
  letter-spacing: 0;
}

.brand-copy {
  max-width: 430px;
  margin: 20px 0 30px;
  color: #526356;
  font-size: 17px;
  line-height: 1.75;
}

.brand-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-width: 500px;
}

.brand-stats div {
  padding: 16px 14px;
  border: 1px solid rgba(83, 115, 86, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(14px);
}

.brand-stats strong,
.brand-stats span {
  display: block;
}

.brand-stats strong {
  margin-bottom: 6px;
  color: #2c6f49;
  font-size: 15px;
}

.brand-stats span {
  color: #657568;
  font-size: 12px;
}

.login-card {
  width: 100%;
  padding: 38px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 24px 70px rgba(57, 80, 54, 0.18);
  backdrop-filter: blur(18px);
}

.card-header {
  margin-bottom: 28px;
}

.card-header span {
  color: #7b8c7f;
  font-size: 13px;
  font-weight: 600;
}

.card-header h2 {
  margin: 8px 0 0;
  color: #23352a;
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: 0;
}

.login-button {
  width: 100%;
  height: 44px;
  border: none;
  background: linear-gradient(135deg, #27754b, #d08a35);
  box-shadow: 0 12px 26px rgba(72, 116, 68, 0.22);
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 32px rgba(72, 116, 68, 0.28);
}

:deep(.el-input__wrapper) {
  min-height: 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0 0 1px rgba(92, 111, 91, 0.14) inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3c8b5d inset, 0 8px 22px rgba(72, 116, 68, 0.12);
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes floatShape {
  0%, 100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(16px, -18px, 0) scale(1.04);
  }
}

@media (max-width: 860px) {
  .login-container {
    padding: 24px;
  }

  .login-shell {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .brand-panel h1 {
    font-size: 42px;
  }

  .brand-copy {
    margin-bottom: 20px;
    font-size: 15px;
  }

  .brand-stats {
    display: none;
  }
}

@media (max-width: 520px) {
  .login-container {
    align-items: flex-start;
    padding: 28px 16px;
  }

  .brand-mark {
    width: 48px;
    height: 48px;
    margin-bottom: 18px;
    border-radius: 14px;
    font-size: 23px;
  }

  .brand-panel h1 {
    font-size: 34px;
  }

  .login-card {
    padding: 28px 20px;
  }

  .card-header h2 {
    font-size: 26px;
  }
}
</style>

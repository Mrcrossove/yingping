<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

onLaunch(() => {
  const store = useUserStore()
  store.checkLogin()
})
</script>

<style>
page { background: #f5f5f5; font-size: 14px; color: #333; }
</style>

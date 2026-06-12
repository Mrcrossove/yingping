<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

onLaunch((options: any) => {
  const store = useUserStore()
  store.capturePromoterCode(options)
  store.checkLogin()
})
</script>

<style>
page {
  background: #f4f7f2;
  color: #26382c;
  font-size: 14px;
}
</style>

<script setup lang="ts">
import type { ProxySettings } from '@/utools/proxyManager'
import { onMounted, onUnmounted, ref } from 'vue'

const proxyStatus = ref<ProxySettings>({ enabled: false })
let removeListener: (() => void) | null = null

function updateStatus(settings: ProxySettings) {
  proxyStatus.value = settings
}

onMounted(() => {
  // 使用实时状态更新
  removeListener = window.customApis.onSettingsChange(updateStatus)
})

onUnmounted(() => {
  if (removeListener) {
    removeListener()
  }
})
</script>

<template>
  <div class="proxy-status">
    <h2>系统代理状态</h2>
    <div class="status">
      <p>代理状态: {{ proxyStatus.enabled ? '已启用' : '未启用' }}</p>
      <template v-if="proxyStatus.enabled">
        <p>代理服务器: {{ proxyStatus.host }}:{{ proxyStatus.port }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.proxy-status {
  padding: 20px;
}

.status {
  margin-top: 10px;
}
</style>

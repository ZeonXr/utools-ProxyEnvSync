<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import EnvStatus from './EnvStatus.vue'
import SystemProxyStatus from './SystemProxyStatus.vue'

const proxyStatus = ref({
  enabled: false,
  host: '',
  port: '',
})

const envStatus = ref({
  http_proxy: '',
  https_proxy: '',
  all_proxy: '',
})
const { onUpdateStatus } = window.proxyManager

const statusUpdater = onUpdateStatus(({ systemProxy, env }) => {
  Object.assign(proxyStatus.value, systemProxy)
  Object.assign(envStatus.value, env)
})

onUnmounted(() => {
  statusUpdater()
})
</script>

<template>
  <div class="flex gap-4">
    <SystemProxyStatus :proxy-status="proxyStatus" class="flex-1" />
    <EnvStatus :env-status="envStatus" class="flex-1" />
  </div>
</template>

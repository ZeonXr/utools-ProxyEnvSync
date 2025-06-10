<script setup lang="ts">
interface EnvStatus {
  enabled: boolean
  proxyUrl?: string
}

defineProps<{
  envStatus: EnvStatus
}>()
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
    <div class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
      环境变量状态
    </div>
    <div class="space-y-4">
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">HTTP_PROXY</span>
        <span class="text-gray-900 dark:text-gray-100">{{ envStatus.proxyUrl }}</span>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">HTTPS_PROXY</span>
        <span class="text-gray-900 dark:text-gray-100">{{ envStatus.proxyUrl }}</span>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">ALL_PROXY</span>
        <span class="text-gray-900 dark:text-gray-100">{{ envStatus.proxyUrl }}</span>
      </div>
    </div>
  </div>
</template>

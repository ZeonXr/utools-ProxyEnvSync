<script setup lang="ts">
import Card from './Card.vue'

interface EnvStatus {
  enabled: boolean
  proxyUrl?: string
}

defineProps<{
  envStatus: EnvStatus
}>()
</script>

<template>
  <Card title="环境变量状态">
    <div class="space-y-4">
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">http_proxy</span>
        <span class="text-gray-900 dark:text-gray-100">{{ envStatus.proxyUrl }}</span>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">https_proxy</span>
        <span class="text-gray-900 dark:text-gray-100">{{ envStatus.proxyUrl }}</span>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">all_proxy</span>
        <span class="text-gray-900 dark:text-gray-100">{{ envStatus.proxyUrl }}</span>
      </div>
    </div>
  </Card>
</template>

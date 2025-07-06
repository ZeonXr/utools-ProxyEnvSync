<script setup lang="ts">
import Card from './Card.vue'

defineProps<{
  envStatus: {
    http_proxy: string
    https_proxy: string
    all_proxy: string
  }
}>()
</script>

<template>
  <Card title="环境变量状态">
    <div class="space-y-4">
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">http_proxy</span>
        <span class="dark:text-gray-100 text-gray-900">{{ envStatus.http_proxy || '未设置' }}</span>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">https_proxy</span>
        <span class="text-gray-900 dark:text-gray-100">{{ envStatus.https_proxy || '未设置' }}</span>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">all_proxy</span>
        <span class="text-gray-900 dark:text-gray-100">{{ envStatus.all_proxy || '未设置' }}</span>
      </div>
    </div>
  </Card>
</template>

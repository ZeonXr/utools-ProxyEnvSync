<script setup lang="ts">
import type { ProxySettings } from '@/utools/proxyManager'

defineProps<{
  proxyStatus: ProxySettings
}>()
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
    <div class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
      系统代理状态
    </div>
    <div class="space-y-4">
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">代理状态</span>
        <span :class="proxyStatus.enabled ? 'text-green-500' : 'text-red-500'">
          {{ proxyStatus.enabled ? '已启用' : '已禁用' }}
        </span>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">代理服务器</span>
        <span class="text-gray-900 dark:text-gray-100">{{ proxyStatus.host }}</span>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">代理端口</span>
        <span class="text-gray-900 dark:text-gray-100">{{ proxyStatus.port }}</span>
      </div>
    </div>
  </div>
</template>

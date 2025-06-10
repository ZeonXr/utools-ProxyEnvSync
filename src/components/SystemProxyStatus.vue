<script setup lang="ts">
import type { ProxySettings } from '@/utools/proxyManager'
import Card from './Card.vue'

defineProps<{
  proxyStatus: ProxySettings
}>()
</script>

<template>
  <Card title="系统代理状态" class="flex-1">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-gray-700 dark:text-gray-300">代理状态</span>
        <span :class="proxyStatus.enabled ? 'text-green-500' : 'text-red-500'">
          {{ proxyStatus.enabled ? '已启用' : '已禁用' }}
        </span>
      </div>
      <div v-if="proxyStatus.enabled" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-gray-700 dark:text-gray-300">代理服务器</span>
          <span class="text-gray-900 dark:text-gray-100">{{ proxyStatus.host }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-gray-700 dark:text-gray-300">代理端口</span>
          <span class="text-gray-900 dark:text-gray-100">{{ proxyStatus.port }}</span>
        </div>
      </div>
    </div>
  </Card>
</template>

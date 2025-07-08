<script setup lang="ts">
import { useDark } from '@vueuse/core'
import PluginSettings from './components/PluginSettings.vue'
import StatusCard from './components/StatusCard.vue'

useDark({
  storageKey: null, // 禁用持久化
  initialValue: 'auto', // 默认跟随系统
})
</script>

<template>
  <div class="flex-col flex gap-4 p-4">
    <StatusCard />
    <PluginSettings />
  </div>
</template>

<style>
:root {
  user-select: none;
}
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

html,
body {
  overflow: hidden;
}

#app {
  overflow-y: auto;
}

html {
  background-color: #f4f4f4;
}

html.dark {
  background-color: #303133;
}

/* 暗黑模式过渡效果 */
.dark {
  color-scheme: dark;
}

.dark * {
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}
</style>

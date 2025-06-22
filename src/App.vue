<script setup lang="ts">
import { ref } from 'vue'

// import Card from './components/Card.vue'
import EnvStatus from './components/EnvStatus.vue'
// import Switch from './components/Switch.vue'
import SystemProxyStatus from './components/SystemProxyStatus.vue'

const { onUpdateStatus } = window.proxyManager

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

onUpdateStatus((systemProxy, env) => {
  Object.assign(proxyStatus.value, systemProxy)
  Object.assign(envStatus.value, env)
  utools.showNotification(`App.vue`)
})
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <!-- 双栏布局 -->
    <div class="flex gap-4">
      <SystemProxyStatus :proxy-status="proxyStatus" class="flex-1" />
      <EnvStatus :env-status="envStatus" class="flex-1" />
    </div>
    <!-- <Card title="设置">
      <div class="space-y-4">
        <div class="flex items-center justify-between line-height-6">
          <span class="text-gray-700 dark:text-gray-300">变更通知</span>
          <div class="flex items-center gap-2">
            <Switch v-model="notificationEnabled" @update:model-value="toggleNotification" />
          </div>
        </div>
        <div class="flex items-center justify-between line-height-6">
          <span class="text-gray-700 dark:text-gray-300">同步状态</span>
          <div class="flex items-center gap-2">
            <Switch v-model="syncEnabled" @update:model-value="toggleSync" />
          </div>
        </div>
        <div class="flex items-center justify-between line-height-6">
          <span class="text-gray-700 dark:text-gray-300">检查间隔</span>
          <div class="flex items-center gap-2">
            <input
              v-model.number.lazy="checkInterval"
              type="number"
              min="1"
              max="60"
              class="w-20 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              @change="updateCheckInterval(checkInterval)"
            >
            <span class="text-gray-700 dark:text-gray-300">秒</span>
          </div>
        </div>
      </div>
    </Card> -->
  </div>
</template>

<style>
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

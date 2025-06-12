<script setup lang="ts">
import type { ProxySettings } from '@/utools/proxyManager'
import type { ENV_VAR } from '@/utools/proxyManager'
import { useDark } from '@vueuse/core'
import { onMounted, onUnmounted, ref } from 'vue'
import Card from './components/Card.vue'
import EnvStatus from './components/EnvStatus.vue'
import Switch from './components/Switch.vue'
import SystemProxyStatus from './components/SystemProxyStatus.vue'
import { useToast } from './composables/useToast'

const proxyStatus = ref<ProxySettings>({ enabled: false })
const envStatus = ref<Record<ENV_VAR, string>>({
  all_proxy: '',
  http_proxy: '',
  https_proxy: '',
})
const syncEnabled = ref(false)
const notificationEnabled = ref(false)
const systemProxyEnabled = ref(false)
const systemProxyHost = ref('')
const systemProxyPort = ref('')
const checkInterval = ref(5)
useDark({
  storageKey: null, // 禁用持久化
  initialValue: 'auto', // 默认跟随系统
})
// 使用 VueUse 的暗黑模式功能
// const isDark = useDark({
//   storageKey: null, // 禁用持久化
//   initialValue: 'auto', // 默认跟随系统
// })
// const toggleDark = useToggle(isDark)

// 使用 Toast
const { showMessage } = useToast()

function updateStatus(settings: ProxySettings) {
  proxyStatus.value = settings
  systemProxyEnabled.value = settings.enabled
  systemProxyHost.value = settings.host || ''
  systemProxyPort.value = String(settings.port) || ''
  // 当代理状态变化时，也更新环境变量状态
  updateEnvStatus()
}

async function updateEnvStatus() {
  envStatus.value = await window.proxyManager.getEnvStatus()
  console.log('envStatus', envStatus.value)
}

// 切换同步状态
async function toggleSync(enabled: boolean) {
  try {
    await window.proxyManager.setSyncEnabled(enabled)
    syncEnabled.value = enabled
    showMessage(enabled ? '已开启同步' : '已关闭同步')
  }
  catch (error) {
    console.error('设置同步状态失败:', error)
    showMessage('设置同步状态失败', 'error')
    // 恢复开关状态
    syncEnabled.value = !enabled
  }
}

// 切换通知状态
async function toggleNotification(enabled: boolean) {
  try {
    await window.proxyManager.setNotificationEnabled(enabled)
    notificationEnabled.value = enabled
    showMessage(enabled ? '已开启通知' : '已关闭通知')
  }
  catch (error) {
    console.error('设置通知状态失败:', error)
    showMessage('设置通知状态失败', 'error')
    // 恢复开关状态
    notificationEnabled.value = !enabled
  }
}

// 更新检查间隔
async function updateCheckInterval(value: number) {
  try {
    await window.proxyManager.setCheckInterval(value * 1000)
    showMessage('已更新检查间隔')
  }
  catch (error) {
    console.error('更新检查间隔失败:', error)
    showMessage('更新检查间隔失败', 'error')
    // 恢复原值
    checkInterval.value = window.proxyManager.getCheckInterval() / 1000
  }
}

// 获取当前设置
async function getCurrentSettings() {
  try {
    const settings = window.proxyManager.getCurrentSettings()
    updateStatus(settings)
    syncEnabled.value = window.proxyManager.getSyncEnabled()
    notificationEnabled.value = window.proxyManager.getNotificationEnabled()
    checkInterval.value = window.proxyManager.getCheckInterval() / 1000
  }
  catch (error) {
    console.error('获取设置失败:', error)
    showMessage('获取设置失败', 'error')
  }
}

let settingsChangeUnsubscribe: (() => void) | null = null
onMounted(async () => {
  settingsChangeUnsubscribe = window.proxyManager.onSettingsChange(updateStatus)
  await getCurrentSettings()
})

onUnmounted(() => {
  if (settingsChangeUnsubscribe) {
    settingsChangeUnsubscribe()
  }
})
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <!-- 标题栏 -->
    <!-- <div class="flex justify-between items-center">
      <div class="text-2xl font-bold text-gray-800 dark:text-gray-100" @click="updateEnvStatus">
        系统代理设置
      </div>
      <button
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="toggleDark()"
      >
        <span v-if="isDark" class="text-yellow-400">🌞</span>
        <span v-else class="text-gray-600">🌙</span>
      </button>
    </div> -->

    <!-- 双栏布局 -->
    <div class="flex gap-4">
      <!-- 左侧系统代理状态 -->
      <SystemProxyStatus :proxy-status="proxyStatus" class="flex-1" />

      <!-- 右侧环境变量状态 -->
      <EnvStatus :env-status="envStatus" class="flex-1" />
    </div>

    <!-- 通知状态设置 -->
    <Card title="设置">
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
    </Card>
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

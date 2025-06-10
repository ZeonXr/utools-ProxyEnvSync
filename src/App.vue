<script setup lang="ts">
import type { ProxySettings } from '@/utools/proxyManager'
import { useDark, useToggle } from '@vueuse/core'
import { onMounted, onUnmounted, ref } from 'vue'
import EnvStatus from './components/EnvStatus.vue'
import SystemProxyStatus from './components/SystemProxyStatus.vue'

const proxyStatus = ref<ProxySettings>({ enabled: false })
const envStatus = ref<{ enabled: boolean, proxyUrl?: string }>({ enabled: false })
const syncEnabled = ref(false)
const notificationEnabled = ref(false)
const systemProxyEnabled = ref(false)
const systemProxyHost = ref('')
const systemProxyPort = ref('')
const checkInterval = ref(5)
let removeListener: (() => void) | null = null
let settingsChangeUnsubscribe: (() => void) | null = null

// 使用 VueUse 的暗黑模式功能
const isDark = useDark()
const toggleDark = useToggle(isDark)

function updateStatus(settings: ProxySettings) {
  proxyStatus.value = settings
  // 当代理状态变化时，也更新环境变量状态
  updateEnvStatus()
}

async function updateEnvStatus() {
  envStatus.value = await window.customApis.getEnvStatus()
}

// 切换同步状态
async function toggleSync(enabled: boolean) {
  try {
    await window.customApis.setSyncEnabled(enabled)
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
    await window.customApis.setNotificationEnabled(enabled)
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
    await window.customApis.setCheckInterval(value * 1000)
    showMessage('已更新检查间隔')
  }
  catch (error) {
    console.error('更新检查间隔失败:', error)
    showMessage('更新检查间隔失败', 'error')
    // 恢复原值
    checkInterval.value = await window.customApis.getCheckInterval() / 1000
  }
}

// 显示消息
function showMessage(message: string, type: 'success' | 'error' = 'success') {
  const messageEl = document.createElement('div')
  messageEl.className = `message ${type}`
  messageEl.textContent = message
  document.body.appendChild(messageEl)

  setTimeout(() => {
    messageEl.remove()
  }, 3000)
}

// 监听设置变化
function handleSettingsChange(settings: ProxySettings) {
  systemProxyEnabled.value = settings.enabled
  systemProxyHost.value = settings.host || ''
  systemProxyPort.value = String(settings.port) || ''
  getCurrentSettings()
}

// 获取当前设置
async function getCurrentSettings() {
  try {
    const settings = await window.customApis.getCurrentSettings()
    systemProxyEnabled.value = settings.enabled
    systemProxyHost.value = settings.host || ''
    systemProxyPort.value = String(settings.port) || ''
    envStatus.value = await window.customApis.getEnvStatus()
    syncEnabled.value = await window.customApis.getSyncEnabled()
    notificationEnabled.value = await window.customApis.getNotificationEnabled()
    checkInterval.value = await window.customApis.getCheckInterval() / 1000
  }
  catch (error) {
    console.error('获取设置失败:', error)
    showMessage('获取设置失败', 'error')
  }
}

onMounted(async () => {
  // 使用实时状态更新
  removeListener = window.customApis.onSettingsChange(updateStatus)
  // 初始化环境变量状态
  await updateEnvStatus()
  // 初始化同步状态
  syncEnabled.value = window.customApis.getSyncEnabled()
  settingsChangeUnsubscribe = window.customApis.onSettingsChange(handleSettingsChange)
})

onUnmounted(() => {
  if (removeListener) {
    removeListener()
  }
  if (settingsChangeUnsubscribe) {
    settingsChangeUnsubscribe()
  }
})
</script>

<template>
  <div class="dark:bg-#303133 bg-#f4f4f4 p-4 min-h-screen">
    <div class="mx-auto">
      <div class="flex flex-col gap-4">
        <!-- 标题栏 -->
        <div class="flex justify-between items-center">
          <div class="text-2xl font-bold text-gray-800 dark:text-gray-100">
            系统代理设置
          </div>
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="toggleDark()"
          >
            <span v-if="isDark" class="text-yellow-400">🌞</span>
            <span v-else class="text-gray-600">🌙</span>
          </button>
        </div>

        <!-- 通知状态设置 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
            通知设置
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-700 dark:text-gray-300">通知状态</span>
            <div class="flex items-center gap-2">
              <span :class="notificationEnabled ? 'text-green-500' : 'text-red-500'">
                {{ notificationEnabled ? '已开启' : '已关闭' }}
              </span>
              <button
                class="px-3 py-1 rounded text-sm"
                :class="notificationEnabled ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800' : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'"
                @click="toggleNotification(!notificationEnabled)"
              >
                {{ notificationEnabled ? '关闭通知' : '开启通知' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 同步状态设置 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
            同步设置
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-700 dark:text-gray-300">同步状态</span>
            <div class="flex items-center gap-2">
              <span :class="syncEnabled ? 'text-green-500' : 'text-red-500'">
                {{ syncEnabled ? '已开启' : '已关闭' }}
              </span>
              <button
                class="px-3 py-1 rounded text-sm"
                :class="syncEnabled ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800' : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'"
                @click="toggleSync(!syncEnabled)"
              >
                {{ syncEnabled ? '关闭同步' : '开启同步' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 双栏布局 -->
        <div class="flex gap-4">
          <!-- 左侧系统代理状态 -->
          <SystemProxyStatus :proxy-status="proxyStatus" class="flex-1" />

          <!-- 右侧环境变量状态 -->
          <EnvStatus :env-status="envStatus" class="flex-1" />
        </div>

        <!-- 检查间隔设置 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
            检查间隔设置
          </div>
          <div class="flex items-center gap-4">
            <input
              v-model="checkInterval"
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
    </div>
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

/* 消息提示样式 */
.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.message.success {
  background-color: #10b981;
  color: white;
}

.message.error {
  background-color: #ef4444;
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
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

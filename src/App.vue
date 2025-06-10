<script setup lang="ts">
import type { ProxySettings } from '@/utools/proxyManager'
import { onMounted, onUnmounted, ref } from 'vue'

interface EnvStatus {
  enabled: boolean
  proxyUrl?: string
}

const proxyStatus = ref<ProxySettings>({ enabled: false })
const envStatus = ref<EnvStatus>({ enabled: false })
const syncEnabled = ref(false)
const notificationEnabled = ref(false)
const systemProxyEnabled = ref(false)
const systemProxyHost = ref('')
const systemProxyPort = ref('')
const checkInterval = ref(5)
let removeListener: (() => void) | null = null
let settingsChangeUnsubscribe: (() => void) | null = null

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
  <div class="p-4">
    <div class="mx-auto">
      <div class="flex flex-col gap-4">
        <!-- 标题 -->
        <div class="text-2xl font-bold text-gray-800">
          系统代理设置
        </div>

        <!-- 双栏布局 -->
        <div class="flex gap-4">
          <!-- 左侧系统代理状态 -->
          <div class="flex-1 bg-white rounded-lg shadow p-4">
            <div class="text-lg font-semibold mb-4">
              系统代理状态
            </div>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-gray-700">代理状态</span>
                <span :class="proxyStatus.enabled ? 'text-green-500' : 'text-red-500'">
                  {{ proxyStatus.enabled ? '已启用' : '已禁用' }}
                </span>
              </div>
              <div v-if="proxyStatus.enabled" class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-gray-700">代理服务器</span>
                  <span class="text-gray-900">{{ proxyStatus.host }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-700">代理端口</span>
                  <span class="text-gray-900">{{ proxyStatus.port }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-700">通知状态</span>
                <div class="flex items-center gap-2">
                  <span :class="notificationEnabled ? 'text-green-500' : 'text-red-500'">
                    {{ notificationEnabled ? '已开启' : '已关闭' }}
                  </span>
                  <button
                    class="px-3 py-1 rounded text-sm"
                    :class="notificationEnabled ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'"
                    @click="toggleNotification(!notificationEnabled)"
                  >
                    {{ notificationEnabled ? '关闭通知' : '开启通知' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧环境变量状态 -->
          <div class="flex-1 bg-white rounded-lg shadow p-4">
            <div class="text-lg font-semibold mb-4">
              环境变量状态
            </div>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-gray-700">同步状态</span>
                <div class="flex items-center gap-2">
                  <span :class="syncEnabled ? 'text-green-500' : 'text-red-500'">
                    {{ syncEnabled ? '已开启' : '已关闭' }}
                  </span>
                  <button
                    class="px-3 py-1 rounded text-sm"
                    :class="syncEnabled ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'"
                    @click="toggleSync(!syncEnabled)"
                  >
                    {{ syncEnabled ? '关闭同步' : '开启同步' }}
                  </button>
                </div>
              </div>
              <div v-if="envStatus.enabled" class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-gray-700">HTTP_PROXY</span>
                  <span class="text-gray-900">{{ envStatus.proxyUrl }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-700">HTTPS_PROXY</span>
                  <span class="text-gray-900">{{ envStatus.proxyUrl }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-700">ALL_PROXY</span>
                  <span class="text-gray-900">{{ envStatus.proxyUrl }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 检查间隔设置 -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-lg font-semibold mb-4">
            检查间隔设置
          </div>
          <div class="flex items-center gap-4">
            <input
              v-model="checkInterval"
              type="number"
              min="1"
              max="60"
              class="w-20 px-3 py-2 border rounded"
              @change="updateCheckInterval(checkInterval)"
            >
            <span class="text-gray-700">秒</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 删除所有样式，因为已经使用 UnoCSS 替换 */
</style>

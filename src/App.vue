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
  <div class="container">
    <div class="header">
      <h1>AutoProxy</h1>
      <div class="sync-switch">
        <span>同步系统代理</span>
        <label class="switch">
          <input
            type="checkbox"
            :checked="syncEnabled"
            @change="toggleSync(!syncEnabled)"
          >
          <span class="slider" />
        </label>
      </div>
    </div>

    <div class="settings">
      <div class="form-item">
        <label>检查间隔</label>
        <div class="input-group">
          <input
            v-model="checkInterval"
            type="number"
            :min="1"
            :max="60"
            :disabled="!syncEnabled"
            class="number-input"
            @change="updateCheckInterval(checkInterval)"
          >
          <span class="unit">秒</span>
        </div>
      </div>
    </div>

    <div class="status">
      <div class="status-item">
        <span class="label">系统代理状态：</span>
        <span class="status-badge" :class="{ success: systemProxyEnabled }">
          {{ systemProxyEnabled ? '已启用' : '未启用' }}
        </span>
      </div>
      <div class="status-item">
        <span class="label">环境变量状态：</span>
        <span class="status-badge" :class="{ success: envStatus.enabled }">
          {{ envStatus.enabled ? '已同步' : '未同步' }}
        </span>
      </div>
    </div>

    <div v-if="systemProxyEnabled" class="proxy-info">
      <div class="info-item">
        <span class="label">代理服务器：</span>
        <span class="value">{{ systemProxyHost }}</span>
      </div>
      <div class="info-item">
        <span class="label">代理端口：</span>
        <span class="value">{{ systemProxyPort }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.sync-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4caf50;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.settings {
  margin-bottom: 20px;
}

.form-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.form-item label {
  width: 120px;
  color: #666;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.number-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.unit {
  color: #666;
}

.status {
  margin-bottom: 20px;
}

.status-item {
  margin-bottom: 10px;
}

.label {
  color: #666;
  margin-right: 10px;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #f5f5f5;
  color: #666;
}

.status-badge.success {
  background-color: #e8f5e9;
  color: #4caf50;
}

.proxy-info {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.info-item {
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.value {
  color: #2196f3;
  font-weight: 500;
}

/* 消息提示样式 */
.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  border-radius: 4px;
  color: white;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.message.success {
  background-color: #4caf50;
}

.message.error {
  background-color: #f44336;
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
</style>

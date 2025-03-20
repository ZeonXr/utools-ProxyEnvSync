<script setup lang="ts">
import type { ProxySettings } from '@/utools/proxyManager'
import { onMounted, onUnmounted, ref } from 'vue'

const proxyStatus = ref<ProxySettings>({ enabled: false })
const envStatus = ref<{ enabled: boolean, proxyUrl?: string }>({ enabled: false })
const syncEnabled = ref(true)
let removeListener: (() => void) | null = null

function updateStatus(settings: ProxySettings) {
  proxyStatus.value = settings
  // 当代理状态变化时，也更新环境变量状态
  updateEnvStatus()
}

async function updateEnvStatus() {
  envStatus.value = await window.customApis.getEnvStatus()
}

function toggleSync(enabled: boolean) {
  syncEnabled.value = enabled
  window.customApis.setSyncEnabled(enabled)
}

onMounted(async () => {
  // 使用实时状态更新
  removeListener = window.customApis.onSettingsChange(updateStatus)
  // 初始化环境变量状态
  await updateEnvStatus()
  // 初始化同步状态
  syncEnabled.value = window.customApis.getSyncEnabled()
})

onUnmounted(() => {
  if (removeListener) {
    removeListener()
  }
})
</script>

<template>
  <div class="container">
    <div class="status-panel">
      <div class="status-card system-proxy">
        <h2>系统代理状态</h2>
        <div class="status-content">
          <p class="status-item">
            状态:
            <span class="status-badge" :class="[proxyStatus.enabled ? 'enabled' : 'disabled']">
              {{ proxyStatus.enabled ? '已启用' : '未启用' }}
            </span>
          </p>
          <template v-if="proxyStatus.enabled">
            <p class="status-item">
              代理服务器: {{ proxyStatus.host }}:{{ proxyStatus.port }}
            </p>
          </template>
        </div>
      </div>

      <div class="sync-control">
        <label class="switch">
          <input
            type="checkbox"
            :checked="syncEnabled"
            @change="toggleSync(!syncEnabled)"
          >
          <span class="slider" />
        </label>
        <div class="sync-label">
          {{ syncEnabled ? '自动同步已开启' : '自动同步已关闭' }}
        </div>
      </div>

      <div class="status-card env-proxy">
        <h2>环境变量状态</h2>
        <div class="status-content">
          <p class="status-item">
            状态:
            <span class="status-badge" :class="[envStatus.enabled ? 'enabled' : 'disabled']">
              {{ envStatus.enabled ? '已配置' : '未配置' }}
            </span>
          </p>
          <template v-if="envStatus.enabled">
            <p class="status-item">
              代理地址: {{ envStatus.proxyUrl }}
            </p>
          </template>
        </div>
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

.status-panel {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.status-card {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sync-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 0;
}

.sync-label {
  font-size: 14px;
  color: #666;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
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
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #52c41a;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.status-card h2 {
  margin: 0 0 16px;
  color: #333;
  font-size: 18px;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.enabled {
  background: #e6f7e6;
  color: #52c41a;
}

.disabled {
  background: #fff1f0;
  color: #ff4d4f;
}
</style>

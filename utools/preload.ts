import type { Awaitable } from '@vueuse/core'
import type { ProxyEnv, ProxySettings } from './ProxyEnvManager'
import { Monitor, PluginSettings } from './pluginController'
import { getProxyEnv, getSystemProxy, setProxyEnv } from './ProxyEnvManager'
import { jsonEqualObject } from './utils'

const onUpdateStatusRemoveCallbacks: Set<() => void> = new Set()
utools.onPluginOut(() => {
  onUpdateStatusRemoveCallbacks.forEach((removeCallback) => {
    removeCallback()
  })
})

export function onUpdateStatus(callback: (args: { systemProxy: ProxySettings, env: ProxyEnv }) => Awaitable<void>) {
  const removeListener = Monitor.addListener(async () => {
    try {
      const [systemProxy, env] = await Promise.all([
        getSystemProxy(),
        getProxyEnv(),
      ])
      await callback({ systemProxy, env })
    }
    catch (error) {
      console.error('Failed to get proxy status:', error)
    }
  })
  const removeCallback = () => {
    removeListener()
    onUpdateStatusRemoveCallbacks.delete(removeCallback)
  }

  onUpdateStatusRemoveCallbacks.add(removeCallback)

  return removeCallback
}

let lastProxyUrl: string | null = null
async function updateProxyEnv(systemProxy: ProxySettings) {
  let proxyUrl = null
  if (systemProxy.enabled && PluginSettings.get('syncEnabled')) {
    proxyUrl = `http://${systemProxy.host}:${systemProxy.port}`
  }
  if (proxyUrl === lastProxyUrl) {
    return
  }
  lastProxyUrl = proxyUrl
  try {
    await setProxyEnv(proxyUrl)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Failed to sync proxy environment variables:', error)
    utools.showNotification(`同步环境变量失败: ${errorMessage}`)
  }
}

let lastSystemProxy: ProxySettings | null = null
const mainProcessStatusListener = onUpdateStatus(async ({ systemProxy }) => {
  if (!jsonEqualObject(lastSystemProxy, systemProxy)) {
    if (PluginSettings.get('notificationEnabled')) {
      utools.showNotification(`代理状态已更新: ${systemProxy.enabled ? '启用' : '禁用'}\n地址: http://${systemProxy.host}:${systemProxy.port}`)
    }
    lastSystemProxy = systemProxy
  }
  await updateProxyEnv(systemProxy)
})

utools.onPluginOut((processExit) => {
  if (processExit) {
    mainProcessStatusListener()
    // 异步清理代理环境变量，不等待结果
    setProxyEnv(null).catch(error => console.error('Failed to clear proxy env on exit:', error))
  }
})

Monitor.start(PluginSettings.get('checkInterval'))

const proxyManager = {
  onUpdateStatus,
  Monitor,
  PluginSettings,
  getSystemProxy,
  updateProxyEnv,
}

window.proxyManager = proxyManager

declare global {
  interface Window {
    proxyManager: typeof proxyManager
  }
}

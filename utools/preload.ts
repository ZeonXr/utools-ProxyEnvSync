import type { ProxyEnv, ProxySettings } from './ProxyEnvManager'
import { Monitor, PluginSettings } from './pluginController'
import { getProxyEnv, getSystemProxy, setProxyEnv } from './ProxyEnvManager'
import { jsonEqualObject } from './utils'

Monitor.start(PluginSettings.get('checkInterval'))

const onUpdateStatusRemoveCallbacks: Set<() => void> = new Set()
utools.onPluginOut(() => {
  onUpdateStatusRemoveCallbacks.forEach((removeCallback) => {
    removeCallback()
  })
})

export function onUpdateStatus(callback: (args: { systemProxy: ProxySettings, env: ProxyEnv, forceUpdate: boolean }) => void) {
  const removeListener = Monitor.addListener(async (force) => {
    try {
      const [systemProxy, env] = await Promise.all([
        getSystemProxy(),
        getProxyEnv(),
      ])
      callback({ systemProxy, env, forceUpdate: force })
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

let lastSystemProxy: ProxySettings | null = null
async function updateProxyEnv(systemProxy: ProxySettings) {
  try {
    if (systemProxy.enabled && PluginSettings.get('syncEnabled')) {
      const proxyUrl = `http://${systemProxy.host}:${systemProxy.port}`
      await setProxyEnv(proxyUrl)
    }
    else {
      await setProxyEnv(null)
    }
  }
  catch (error) {
    console.error('Failed to update proxy environment:', error)
  }
}
const mainProcessStatusListener = onUpdateStatus(async ({ systemProxy, forceUpdate }) => {
  if (!forceUpdate && jsonEqualObject(lastSystemProxy, systemProxy)) {
    return
  }
  if (PluginSettings.get('notificationEnabled')) {
    utools.showNotification(`代理状态已更新: ${systemProxy.enabled ? '启用' : '禁用'}\n地址: http://${systemProxy.host}:${systemProxy.port}`)
  }
  lastSystemProxy = systemProxy
  await updateProxyEnv(systemProxy)
})

utools.onPluginOut((processExit) => {
  if (processExit) {
    mainProcessStatusListener()
    // 异步清理代理环境变量，不等待结果
    setProxyEnv(null).catch((error) => {
      console.error('Failed to clear proxy environment on exit:', error)
    })
  }
})

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

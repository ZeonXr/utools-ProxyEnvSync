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
  const removeListener = Monitor.addListener((force) => {
    const systemProxy = getSystemProxy()
    const env = getProxyEnv()
    callback({ systemProxy, env, forceUpdate: force })
  })
  const removeCallback = () => {
    removeListener()
    onUpdateStatusRemoveCallbacks.delete(removeCallback)
  }

  onUpdateStatusRemoveCallbacks.add(removeCallback)

  return removeCallback
}

let lastSystemProxy: ProxySettings | null = null
function updateProxyEnv(systemProxy: ProxySettings) {
  if (systemProxy.enabled && PluginSettings.get('syncEnabled')) {
    const proxyUrl = `http://${systemProxy.host}:${systemProxy.port}`
    setProxyEnv(proxyUrl)
  }
  else {
    setProxyEnv(null)
  }
}
const mainProcessStatusListener = onUpdateStatus(({ systemProxy, forceUpdate }) => {
  if (!forceUpdate && jsonEqualObject(lastSystemProxy, systemProxy)) {
    return
  }
  if (PluginSettings.get('notificationEnabled')) {
    utools.showNotification(`代理状态已更新: ${systemProxy.enabled ? '启用' : '禁用'}\n地址: http://${systemProxy.host}:${systemProxy.port}`)
  }
  lastSystemProxy = systemProxy
  if (systemProxy.enabled && PluginSettings.get('syncEnabled')) {
    const proxyUrl = `http://${systemProxy.host}:${systemProxy.port}`
    setProxyEnv(proxyUrl)
  }
  else {
    setProxyEnv(null)
  }
  updateProxyEnv(systemProxy)
})

utools.onPluginOut((processExit) => {
  if (processExit) {
    mainProcessStatusListener()
    setProxyEnv(null)
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

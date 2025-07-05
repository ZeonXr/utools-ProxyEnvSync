import type { ProxyEnv, ProxySettings } from './ProxyEnvManager'
import { Monitor, PluginSettings } from './pluginController'
import { getProxyEnv, getSystemProxy, setProxyEnv } from './ProxyEnvManager'
// import { jsonEqualObject } from './utils'

Monitor.start(PluginSettings.get('checkInterval'))

// let lastSystemProxy: ProxySettings | null = null

// const onUpdateProxyCallbacks: Set<(systemProxy: ProxySettings) => void> = new Set()
// export function onUpdateProxy(callback: (systemProxy: ProxySettings) => void) {
//   onUpdateProxyCallbacks.add(callback)
//   return () => {
//     onUpdateProxyCallbacks.delete(callback)
//   }
// }

// Monitor.addListener(() => {
//   const newSystemProxy = getSystemProxy()
//   if (jsonEqualObject(newSystemProxy, lastSystemProxy)) {
//     return
//   }
//   lastSystemProxy = newSystemProxy
//   onUpdateProxyCallbacks.forEach((callback) => {
//     try {
//       callback(newSystemProxy)
//     }
//     catch (error) {
//       console.error('执行更新回调时发生错误:', error)
//     }
//   })
// })

// function updateStatus() {
//   const systemProxy = getSystemProxy()
//   const env = getProxyEnv()
//   onUpdateStatusCallbacks.forEach((callback) => {
//     try {
//       callback(systemProxy, env)
//     }
//     catch (error) {
//       console.error('执行状态更新回调时发生错误:', error)
//     }
//   })
// }
// utools.onPluginEnter(() => {
//   Monitor.addListener(updateStatus)
// })
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
  if (!forceUpdate && lastSystemProxy && JSON.stringify(lastSystemProxy) === JSON.stringify(systemProxy)) {
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

// utools.onPluginEnter(() => {
//   console.log('插件进入，当前值:', xxx)
//   xxx += 1
// })

// Monitor.addListener(() => {
//   utools.showNotification(`插件已加载，当前值`)
// })

// utools.onPluginOut(() => {
//   utools.showNotification(`preload`)
// })
// let xxx = 1
// setInterval(() => {
//   utools.showNotification(`preload ${xxx}`)
//   xxx += 1
// }, 5000)

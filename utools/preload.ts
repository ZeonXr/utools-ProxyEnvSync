import type { ProxyEnv, ProxySettings } from './ProxyEnvManager'
import { Monitor, PluginSettings } from './pluginController'
import { getProxyEnv, getSystemProxy } from './ProxyEnvManager'
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

export function onUpdateStatus(callback: (systemProxy: ProxySettings, env: ProxyEnv) => void) {
  const removeListener = Monitor.addListener(() => {
    const systemProxy = getSystemProxy()
    const env = getProxyEnv()
    callback(systemProxy, env)
  })
  const removeCallback = () => {
    removeListener()
    onUpdateStatusRemoveCallbacks.delete(removeCallback)
  }
  onUpdateStatusRemoveCallbacks.add(removeCallback)
  return removeCallback
}

const proxyManager = {
  onUpdateStatus,
}

window.proxyManager = proxyManager

declare global {
  interface Window {
    proxyManager: typeof proxyManager
  }
}

let xxx = 1
utools.onPluginEnter(() => {
  console.log('插件进入，当前值:', xxx)
  xxx += 1
})

// Monitor.addListener(() => {
//   utools.showNotification(`插件已加载，当前值`)
// })

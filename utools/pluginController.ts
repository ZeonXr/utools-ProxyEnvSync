const Storage: Record<string, [string, any]> = {
  checkInterval: ['ProxyEnvSync.checkInterval', 20000],
  syncEnabled: ['ProxyEnvSync.syncEnabled', false],
  notificationEnabled: ['ProxyEnvSync.notificationEnabled', false],
} as const

export const PluginSettings = (() => {

})()

// 状态更新器
export const Monitor = (() => {
  let monitorInterval: NodeJS.Timeout | null = null
  const callbacks: Set<() => any> = new Set()

  function start() {
    if (monitorInterval) {
      clearInterval(monitorInterval)
    }
    monitorInterval = setInterval(() => {
      callbacks.forEach(callback => callback())
    }, Storage.checkInterval[1])
  }

  function stop() {
    if (monitorInterval) {
      clearInterval(monitorInterval)
    }
  }

  function addCallback(callback: () => any) {
    callbacks.add(callback)
  }

  function removeCallback(callback: () => any) {
    callbacks.delete(callback)
  }

  return {
    start,
    stop,
    addCallback,
    removeCallback,
  }
})()

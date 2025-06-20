const Storage: Record<string, [string, any]> = {
  checkInterval: ['ProxyEnvSync.checkInterval', 20000],
  syncEnabled: ['ProxyEnvSync.syncEnabled', false],
  notificationEnabled: ['ProxyEnvSync.notificationEnabled', false],
} as const
type StorageKey = keyof typeof Storage

export const PluginSettings = (() => {
  function get(): Record<StorageKey, any>
  function get(key: StorageKey): any
  function get(key?: StorageKey): Record<StorageKey, any> | any {
    if (key === void 0) {
      return Object.fromEntries(Object.entries(Storage).map(([key]) => [key, get(key)]))
    }
    else {
      const value = utools.dbStorage.getItem(Storage[key][0])
      if (value === void 0) {
        return Storage[key][1]
      }
      else {
        return value
      }
    }
  }
  function set(keyOrObject: Record<StorageKey, any>): void
  function set(keyOrObject: StorageKey, value: any): void
  function set(keyOrObject: StorageKey | Record<StorageKey, any>, value?: any): void {
    if (typeof keyOrObject === 'string') {
      utools.dbStorage.setItem(Storage[keyOrObject][0], value)
    }
    else {
      Object.entries(keyOrObject).forEach(([key, value]) => {
        utools.dbStorage.setItem(Storage[key][0], value)
      })
    }
  }

  return {
    get,
    set,
  }
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

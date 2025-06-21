import type { Mutable, PrimitiveType } from './utils'
import { getType } from './utils'

const Storage = {
  checkInterval: 20000 as number,
  syncEnabled: false as boolean,
  notificationEnabled: false as boolean,
} as const satisfies Record<string, PrimitiveType>

type StorageKey = keyof typeof Storage

export class PluginSettings {
  static get(): Mutable<typeof Storage>
  static get<T extends StorageKey>(key: T): typeof Storage[T]
  static get(key?: StorageKey) {
    if (key === void 0) {
      return Object.fromEntries(
        Object.entries(Storage).map(([key]) => [
          key,
          PluginSettings.get(key as StorageKey),
        ]),
      ) as Mutable<typeof Storage>
    }
    else {
      const value = utools.dbStorage.getItem(key)
      if (value === void 0) {
        return PluginSettings.set(key, Storage[key])
      }
      return value
    }
  }

  static set(keyOrObject: typeof Storage): Mutable<typeof Storage>
  static set<T extends StorageKey>(
    keyOrObject: T,
    value: typeof Storage[T]
  ): typeof Storage[T]
  static set(
    keyOrObject: StorageKey | Record<StorageKey, PrimitiveType>,
    value?: PrimitiveType,
  ) {
    const typeOfKeyOrObject = getType(keyOrObject)
    switch (typeOfKeyOrObject) {
      case 'string':
        if (value !== undefined) {
          utools.dbStorage.setItem(keyOrObject as StorageKey, value)
        }
        return PluginSettings.get(keyOrObject as StorageKey)
      case 'object':
        Object.entries(keyOrObject).forEach(([key, value]) => {
          utools.dbStorage.setItem(key as StorageKey, value)
        })
        return PluginSettings.get()
      default:
        throw new Error(`不支持的类型: ${typeOfKeyOrObject}`)
    }
  }
}

export class Monitor {
  private static monitorInterval: NodeJS.Timeout | null = null
  private static callbacks: Set<() => any> = new Set()

  static start(checkInterval: number) {
    this.stop()
    const runCallbacks = () => {
      this.callbacks.forEach((callback) => {
        try {
          callback()
        }
        catch (error) {
          console.error('执行回调函数时发生错误:', error)
        }
      })
    }
    runCallbacks()
    this.monitorInterval = setInterval(
      runCallbacks,
      checkInterval,
    )
  }

  static stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
  }

  static addCallback(callback: () => any) {
    this.callbacks.add(callback)
  }

  static removeCallback(callback: () => any) {
    this.callbacks.delete(callback)
  }
}

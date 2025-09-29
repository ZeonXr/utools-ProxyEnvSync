import type { Mutable, PrimitiveType } from './utils'
import { getType, isEmpty, isNotEmpty } from './utils'

// 定义清晰的回调函数类型
type MonitorCallback = (force: boolean) => void | Promise<void>

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
    if (isNotEmpty(key)) {
      const value = utools.dbStorage.getItem(key)
      if (isEmpty(value)) {
        return PluginSettings.set(key, Storage[key])
      }
      return value
    }
    else {
      return Object.fromEntries(
        Object.entries(Storage).map(([key]) => [
          key,
          PluginSettings.get(key as StorageKey),
        ]),
      ) as Mutable<typeof Storage>
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
  private static checkInterval: number
  private static monitorInterval: NodeJS.Timeout | null = null
  private static callbacks: Set<MonitorCallback> = new Set()
  static async forceRunCallbacks(force: boolean = true) {
    const promises = Array.from(this.callbacks).map(async (callback) => {
      try {
        console.log('执行回调函数:', callback)
        await callback(force)
      }
      catch (error) {
        console.error('执行回调函数时发生错误:', error)
      }
    })
    await Promise.all(promises)
  }

  static start(checkInterval?: number) {
    if (checkInterval !== void 0) {
      this.checkInterval = checkInterval
    }
    if (this.checkInterval === void 0 || this.checkInterval <= 0) {
      throw new Error('checkInterval 不能为空')
    }
    this.stop()
    // 立即执行一次，不等待结果以避免阻塞
    this.forceRunCallbacks(false).catch((error) => {
      console.error('初始回调执行失败:', error)
    })
    this.monitorInterval = setInterval(
      () => {
        // 定时执行，不等待结果以避免阻塞后续的定时器
        this.forceRunCallbacks(false).catch((error) => {
          console.error('定时回调执行失败:', error)
        })
      },
      this.checkInterval,
    )
  }

  static stop() {
    clearInterval(this.monitorInterval!)
    this.monitorInterval = null
  }

  static addListener(listener: MonitorCallback): () => void {
    this.callbacks.add(listener)
    this.start()
    return () => {
      this.removeListener(listener)
    }
  }

  static removeListener(listener: MonitorCallback): boolean {
    return this.callbacks.delete(listener)
  }
}

import type { Awaitable } from '@vueuse/core'
import type { PrimitiveType } from './utils'
import { getType, isEmpty, isNotEmpty } from './utils'

// 定义清晰的回调函数类型
type MonitorCallback = () => Awaitable<void>

// 默认设置存储结构
// [key]: <[type]> [default value]
const Storage = {
  checkInterval: <number> 20000,
  syncEnabled: <boolean> false,
  notificationEnabled: <boolean> false,
} as const satisfies Record<string, PrimitiveType>

type SettingSchema = typeof Storage
type StorageKey = keyof SettingSchema

export class PluginSettings {
  static get(): SettingSchema
  static get<T extends StorageKey>(key: T): SettingSchema[T]
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
      )
    }
  }

  static set(object: Partial<SettingSchema>): SettingSchema
  static set<T extends StorageKey>(
    key: T,
    value: SettingSchema[T]
  ): SettingSchema[T]
  static set(
    keyOrObject: StorageKey | Partial<SettingSchema>,
    value?: PrimitiveType,
  ) {
    const typeOfKeyOrObject = getType(keyOrObject)
    switch (typeOfKeyOrObject) {
      case 'string': {
        const key = keyOrObject as StorageKey
        if (value !== undefined) {
          utools.dbStorage.setItem(key, value)
        }
        return PluginSettings.get(key)
      }
      case 'object': {
        const object = keyOrObject as Partial<SettingSchema>
        Object.entries(object).forEach(([key, value]) => {
          utools.dbStorage.setItem(key, value)
        })
        return PluginSettings.get()
      }
      default:
        throw new Error(`不支持的类型: ${typeOfKeyOrObject}`)
    }
  }
}

export class Monitor {
  private static checkInterval: number
  private static monitorInterval: NodeJS.Timeout | null = null
  private static callbacks: Set<MonitorCallback> = new Set()

  static async runCallbacks() {
    for (const callback of this.callbacks) {
      try {
        await callback()
      }
      catch (error) {
        console.error(`[Monitor] Callback execution failed at ${new Date().toISOString()}:`, error)
      }
    }
  }

  static start(checkInterval?: number) {
    if (checkInterval !== void 0) {
      this.checkInterval = checkInterval
    }
    if (this.checkInterval === void 0 || this.checkInterval <= 0) {
      throw new Error('checkInterval 不能为空')
    }
    this.stop()
    this.runCallbacks()
    this.monitorInterval = setInterval(
      () => this.runCallbacks(),
      this.checkInterval,
    )
  }

  static stop() {
    clearInterval(this.monitorInterval!)
    this.monitorInterval = null
  }

  static isRunning(): boolean {
    return this.monitorInterval !== null
  }

  static addListener(listener: MonitorCallback): () => void {
    this.callbacks.add(listener)
    this.runCallbacks()
    return () => {
      this.removeListener(listener)
    }
  }

  static removeListener(listener: MonitorCallback): boolean {
    return this.callbacks.delete(listener)
  }
}

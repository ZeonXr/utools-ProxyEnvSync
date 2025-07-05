import type { Mutable, PrimitiveType } from './utils'
import { getType, isEmpty, isNotEmpty } from './utils'

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
      console.log(`获取设置: ${key} = ${value}`)
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
  private static callbacks: Set<(force: boolean) => any> = new Set()
  // static forceRunCallbacks: (() => void) | null = null
  static forceRunCallbacks(force: boolean = true) {
    this.callbacks.forEach((callback) => {
      try {
        callback(force)
      }
      catch (error) {
        console.error('执行回调函数时发生错误:', error)
      }
    })
  }

  static start(checkInterval?: number) {
    if (checkInterval !== void 0) {
      this.checkInterval = checkInterval
    }
    if (this.checkInterval === void 0 || this.checkInterval <= 0) {
      throw new Error('checkInterval 不能为空')
    }
    this.stop()
    //   const runCallbacks = () => {
    //     this.callbacks.forEach((callback) => {
    //       try {
    //         callback()
    //       }
    //       catch (error) {
    //         console.error('执行回调函数时发生错误:', error)
    //       }
    //     })
    //   }
    //   runCallbacks()
    //   this.monitorInterval = setInterval(
    //     runCallbacks,
    //     this.checkInterval,
    //   )
    //   this.forceRunCallbacks = runCallbacks
    //   return runCallbacks
    this.forceRunCallbacks(false)
    this.monitorInterval = setInterval(
      () => this.forceRunCallbacks(false),
      this.checkInterval,
    )
  }

  static stop() {
    clearInterval(this.monitorInterval!)
    this.monitorInterval = null
  }

  static addListener(listener: typeof Monitor.callbacks extends Set<infer T> ? T : never) {
    this.callbacks.add(listener)
    this.start()
    return () => {
      this.removeListener(listener)
    }
  }

  static removeListener(listener: typeof Monitor.callbacks extends Set<infer T> ? T : never) {
    return this.callbacks.delete(listener)
  }
}

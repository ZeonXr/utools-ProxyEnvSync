import type { ENV_VAR } from './ProxyEnvManager'
import { exec } from 'node:child_process'
import os from 'node:os'
import { promisify } from 'node:util'
import { getProxyEnv, setProxyEnv } from './ProxyEnvManager'

const execAsync = promisify(exec)

// 默认检查系统代理状态的刷新频率（毫秒）
const DEFAULT_PROXY_CHECK_INTERVAL = 20000
const STORAGE_KEY = 'ProxyEnvSync.syncEnabled'
const CHECK_INTERVAL_KEY = 'ProxyEnvSync.checkInterval'
const NOTIFICATION_ENABLED_KEY = 'ProxyEnvSync.notificationEnabled'

// 环境变量配置
// const ENV_VARS = ['all_proxy', 'http_proxy', 'https_proxy'] as const

export interface ProxySettings {
  enabled: boolean
  host?: string
  port?: number
}

type SettingsChangeCallback = (settings: ProxySettings) => void

class ProxyManager {
  private static instance: ProxyManager
  private currentSettings: ProxySettings = { enabled: false }
  private checkInterval: NodeJS.Timeout | null = null
  private platform: NodeJS.Platform
  private networkInterface: string | null = null
  private settingsChangeListeners: Set<SettingsChangeCallback> = new Set()
  private syncEnabled: boolean
  private checkIntervalMs: number
  private notificationEnabled: boolean

  private constructor() {
    this.platform = os.platform()
    // 从存储中读取同步设置，默认为 true
    this.syncEnabled = utools.dbStorage.getItem(STORAGE_KEY) ?? true
    // 从存储中读取检查间隔，默认为 5000ms
    this.checkIntervalMs = utools.dbStorage.getItem(CHECK_INTERVAL_KEY) ?? DEFAULT_PROXY_CHECK_INTERVAL
    // 从存储中读取通知设置，默认为 true
    this.notificationEnabled = utools.dbStorage.getItem(NOTIFICATION_ENABLED_KEY) ?? true
  }

  public static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager()
    }
    return ProxyManager.instance
  }

  public onSettingsChange(callback: SettingsChangeCallback): () => void {
    this.settingsChangeListeners.add(callback)
    // 立即通知当前状态
    callback(this.getCurrentSettings())
    return () => {
      this.settingsChangeListeners.delete(callback)
    }
  }

  // public removeSettingsChangeListener(callback: SettingsChangeCallback): void {
  //   this.settingsChangeListeners = this.settingsChangeListeners.filter(cb => cb !== callback)
  // }

  private notifySettingsChange(settings: ProxySettings): void {
    this.settingsChangeListeners.forEach(callback => callback(settings))

    // 只在启用通知时发送 uTools 通知
    if (this.notificationEnabled) {
      if (settings.enabled) {
        utools.showNotification(`系统代理已启用: ${settings.host}:${settings.port}`)
      }
      else {
        utools.showNotification('系统代理已禁用')
      }
    }
  }

  public async startMonitoring(): Promise<void> {
    if (this.checkInterval) {
      return
    }

    // 初始化网络接口
    if (this.platform === 'darwin') {
      await this.initializeNetworkInterface()
    }

    // 立即检查一次当前状态
    await this.checkAndUpdateProxy()

    // 使用配置的间隔时间检查系统代理状态
    this.checkInterval = setInterval(async () => {
      await this.checkAndUpdateProxy()
    }, this.checkIntervalMs)
  }

  private async initializeNetworkInterface(): Promise<void> {
    try {
      // 获取所有网络接口
      const { stdout } = await execAsync('networksetup -listallhardwareports')
      const lines = stdout.split('\n')

      // 查找当前活动的网络接口
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.includes('Wi-Fi') || line.includes('Ethernet')) {
          // 获取设备名称
          const deviceLine = lines[i + 1].trim()
          const match = deviceLine.match(/Device: (.+)/)
          if (match) {
            // 检查该接口是否启用
            try {
              const { stdout: status } = await execAsync(`networksetup -getinfo "${line}"`)
              if (status.includes('enabled')) {
                this.networkInterface = line
                console.log('找到活动的网络接口:', this.networkInterface)
                return
              }
            }
            catch {
              // 如果获取状态失败，继续检查下一个接口
              continue
            }
          }
        }
      }

      // 如果没有找到活动的接口，使用默认的 Wi-Fi
      this.networkInterface = 'Wi-Fi'
      console.log('使用默认网络接口:', this.networkInterface)
    }
    catch (error) {
      console.error('获取网络接口失败:', error)
      this.networkInterface = 'Wi-Fi'
    }
  }

  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private async checkAndUpdateProxy(): Promise<void> {
    try {
      const settings = await this.getSystemProxySettings()
      console.log('当前系统代理设置:', settings)

      if (JSON.stringify(settings) !== JSON.stringify(this.currentSettings)) {
        console.log('代理设置发生变化')
        this.currentSettings = settings
        // 只在启用同步时更新环境变量
        if (this.syncEnabled) {
          console.log('更新环境变量')
          await this.updateEnvironmentVariables(settings)
        }
        // 通知监听器
        this.notifySettingsChange(settings)
      }
    }
    catch (error) {
      console.error('检查系统代理设置失败:', error)
    }
  }

  private async getSystemProxySettings(): Promise<ProxySettings> {
    try {
      let command: string
      let enabled = false
      let host: string | undefined
      let port: number | undefined

      switch (this.platform) {
        case 'darwin': { // macOS
          if (!this.networkInterface) {
            await this.initializeNetworkInterface()
          }

          // 尝试获取 Web 代理设置
          try {
            command = `networksetup -getwebproxy "${this.networkInterface}"`
            console.log('执行命令:', command)

            const { stdout: macStdout } = await execAsync(command)
            console.log('命令输出:', macStdout)

            const macLines = macStdout.split('\n')
            enabled = macLines[0].includes('Enabled: Yes')
            host = macLines[1].match(/Server: (.+)/)?.[1]
            port = Number.parseInt(macLines[2].match(/Port: (.+)/)?.[1] || '0')
          }
          catch (error) {
            console.error('获取 Web 代理设置失败，尝试获取安全 Web 代理设置:', error)

            // 如果获取 Web 代理失败，尝试获取安全 Web 代理设置
            command = `networksetup -getsecurewebproxy "${this.networkInterface}"`
            const { stdout: secureStdout } = await execAsync(command)
            const secureLines = secureStdout.split('\n')
            enabled = secureLines[0].includes('Enabled: Yes')
            host = secureLines[1].match(/Server: (.+)/)?.[1]
            port = Number.parseInt(secureLines[2].match(/Port: (.+)/)?.[1] || '0')
          }
          break
        }

        case 'win32': { // Windows
          try {
            command = 'powershell -Command "Get-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\' | Select-Object ProxyEnable,ProxyServer | ConvertTo-Json"'
            const { stdout: winStdout } = await execAsync(command)
            const proxySettings = JSON.parse(winStdout)
            enabled = proxySettings.ProxyEnable === 1
            if (proxySettings.ProxyServer) {
              const [proxyHost, proxyPort] = proxySettings.ProxyServer.split(':')
              host = proxyHost
              port = Number.parseInt(proxyPort || '0')
            }
          }
          catch (error) {
            console.error('获取 Windows 代理设置失败，尝试备用方法:', error)
            // 备用方法：使用 reg query
            command = 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /v ProxyServer'
            const { stdout: winStdout } = await execAsync(command)
            const winLines = winStdout.split('\n')
            enabled = winLines.some(line => line.includes('ProxyEnable') && line.includes('0x1'))
            const proxyServerLine = winLines.find(line => line.includes('ProxyServer'))
            if (proxyServerLine) {
              const proxyServer = proxyServerLine.match(/ProxyServer\s+REG_SZ\s+(.+)/)?.[1]
              if (proxyServer) {
                const [proxyHost, proxyPort] = proxyServer.split(':')
                host = proxyHost
                port = Number.parseInt(proxyPort || '0')
              }
            }
          }
          break
        }
        default: {
          enabled = false
        }
      }

      return {
        enabled,
        host,
        port,
      }
    }
    catch (error) {
      console.error('获取系统代理设置失败:', error)
      return { enabled: false }
    }
  }

  /**
   * @param settings 代理设置
   */
  public async updateEnvironmentVariables(settings: ProxySettings): Promise<void> {
    if (settings.enabled && settings.host && settings.port) {
      const proxyUrl = `http://${settings.host}:${settings.port}`
      setProxyEnv(proxyUrl)
    }
    else {
      setProxyEnv(null)
    }
  }

  public async clearProxyEnv(): Promise<void> {
    // 直接清除所有代理环境变量
    setProxyEnv(null)
  }

  public getCurrentSettings(): ProxySettings {
    return this.currentSettings
  }

  public async getEnvStatus(): Promise<Record<ENV_VAR, string>> {
    const envs = getProxyEnv()
    if (!envs) {
      return (['all_proxy', 'http_proxy', 'https_proxy'] as ENV_VAR[]).reduce((acc, env) => ({ ...acc, [env]: '' }), {} as Record<ENV_VAR, string>)
    }
    return envs
  }

  public async setSyncEnabled(enabled: boolean): Promise<void> {
    this.syncEnabled = enabled
    // 保存设置到存储
    utools.dbStorage.setItem(STORAGE_KEY, enabled)

    // 如果关闭同步，清空环境变量
    if (!enabled) {
      await this.updateEnvironmentVariables({ enabled: false })
    }
    // 如果开启同步，立即同步当前状态
    else if (this.currentSettings.enabled) {
      await this.updateEnvironmentVariables(this.currentSettings)
    }
    this.notifySettingsChange(this.currentSettings)
  }

  public getSyncEnabled(): boolean {
    return this.syncEnabled
  }

  public async setCheckInterval(intervalMs: number): Promise<void> {
    if (intervalMs < 1000) {
      throw new Error('检查间隔不能小于1000毫秒')
    }

    this.checkIntervalMs = intervalMs
    // 保存设置到存储
    utools.dbStorage.setItem(CHECK_INTERVAL_KEY, intervalMs)

    // 如果正在监控，重新设置定时器
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = setInterval(async () => {
        await this.checkAndUpdateProxy()
      }, intervalMs)
    }
  }

  public getCheckInterval(): number {
    return this.checkIntervalMs
  }

  public async setNotificationEnabled(enabled: boolean): Promise<void> {
    this.notificationEnabled = enabled
    // 保存设置到存储
    utools.dbStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled)
  }

  public getNotificationEnabled(): boolean {
    return this.notificationEnabled
  }
}

export default ProxyManager

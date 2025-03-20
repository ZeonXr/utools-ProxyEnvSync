import { exec } from 'node:child_process'
import os from 'node:os'
import process from 'node:process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

// 默认检查系统代理状态的刷新频率（毫秒）
const DEFAULT_PROXY_CHECK_INTERVAL = 5000
const STORAGE_KEY = 'autoProxy.syncEnabled'
const CHECK_INTERVAL_KEY = 'autoProxy.checkInterval'

// 配置文件中的标记
const PROXY_CONFIG_BEGIN = '# BEGIN: AutoProxy Configuration'
const PROXY_CONFIG_END = '# END: AutoProxy Configuration'

// 环境变量配置
const ENV_HTTP_PROXY = 'export http_proxy'
const ENV_HTTPS_PROXY = 'export https_proxy'
const ENV_ALL_PROXY = 'export all_proxy'
const ENV_HTTP_PROXY_UPPER = 'export HTTP_PROXY'
const ENV_HTTPS_PROXY_UPPER = 'export HTTPS_PROXY'
const ENV_ALL_PROXY_UPPER = 'export ALL_PROXY'

// 生成代理配置数组
function generateProxyConfigArray(proxyUrl: string): string[] {
  return [
    `${ENV_HTTP_PROXY}="${proxyUrl}"`,
    `${ENV_HTTPS_PROXY}="${proxyUrl}"`,
    `${ENV_ALL_PROXY}="${proxyUrl}"`,
    `${ENV_HTTP_PROXY_UPPER}="${proxyUrl}"`,
    `${ENV_HTTPS_PROXY_UPPER}="${proxyUrl}"`,
    `${ENV_ALL_PROXY_UPPER}="${proxyUrl}"`,
  ]
}

// 生成完整的代理配置
function generateProxyConfig(proxyUrl: string): string {
  return `${PROXY_CONFIG_BEGIN}
${generateProxyConfigArray(proxyUrl).join('\n')}
${PROXY_CONFIG_END}`
}

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
  private platform: string
  private networkInterface: string | null = null
  private settingsChangeListeners: SettingsChangeCallback[] = []
  private syncEnabled: boolean
  private checkIntervalMs: number

  private constructor() {
    this.platform = os.platform()
    // 从存储中读取同步设置，默认为 true
    this.syncEnabled = utools.dbStorage.getItem(STORAGE_KEY) ?? true
    // 从存储中读取检查间隔，默认为 5000ms
    this.checkIntervalMs = utools.dbStorage.getItem(CHECK_INTERVAL_KEY) ?? DEFAULT_PROXY_CHECK_INTERVAL
  }

  public static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager()
    }
    return ProxyManager.instance
  }

  public onSettingsChange(callback: SettingsChangeCallback): void {
    this.settingsChangeListeners.push(callback)
    // 立即通知当前状态
    callback(this.getCurrentSettings())
  }

  public removeSettingsChangeListener(callback: SettingsChangeCallback): void {
    this.settingsChangeListeners = this.settingsChangeListeners.filter(cb => cb !== callback)
  }

  private notifySettingsChange(settings: ProxySettings): void {
    this.settingsChangeListeners.forEach(callback => callback(settings))

    // 发送 uTools 通知
    if (settings.enabled) {
      utools.showNotification(`系统代理已启用: ${settings.host}:${settings.port}`)
    }
    else {
      utools.showNotification('系统代理已禁用')
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
          command = 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /v ProxyServer'
          const { stdout: winStdout } = await execAsync(command)
          const winLines = winStdout.split('\n')
          enabled = winLines[0].includes('0x1')
          const proxyServer = winLines[1].match(/ProxyServer\s+REG_SZ\s+(.+)/)?.[1]
          if (proxyServer) {
            const [proxyHost, proxyPort] = proxyServer.split(':')
            host = proxyHost
            port = Number.parseInt(proxyPort || '0')
          }
          break
        }

        case 'linux': { // Linux
          // 尝试获取 GNOME 设置
          try {
            const { stdout: gnomeStdout } = await execAsync('gsettings get org.gnome.system.proxy mode')
            enabled = gnomeStdout.includes('manual')
            if (enabled) {
              const { stdout: hostStdout } = await execAsync('gsettings get org.gnome.system.proxy.http host')
              const { stdout: portStdout } = await execAsync('gsettings get org.gnome.system.proxy.http port')
              host = hostStdout.replace(/['"]/g, '')
              port = Number.parseInt(portStdout.replace(/['"]/g, ''))
            }
          }
          catch {
            // 如果 GNOME 设置不可用，尝试获取系统环境变量
            const { stdout: envStdout } = await execAsync('env | grep -i proxy')
            const envLines = envStdout.split('\n')
            const httpProxy = envLines.find(line => line.startsWith('http_proxy='))
            if (httpProxy) {
              const proxyUrl = httpProxy.split('=')[1]
              const url = new URL(proxyUrl)
              host = url.hostname
              port = Number.parseInt(url.port)
              enabled = true
            }
          }
          break
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

  private async updateEnvironmentVariables(settings: ProxySettings): Promise<void> {
    const homeDir = process.env.HOME || process.env.USERPROFILE
    if (!homeDir) {
      console.error('无法获取用户主目录')
      return
    }

    // 根据操作系统选择配置文件
    let configPath: string
    let shellConfigFile: string
    switch (this.platform) {
      case 'win32':
        shellConfigFile = '.bash_profile'
        configPath = `${homeDir}\\${shellConfigFile}`
        break
      case 'darwin': // macOS
        shellConfigFile = '.zshrc'
        configPath = `${homeDir}/${shellConfigFile}`
        break
      default:
        shellConfigFile = process.env.SHELL?.includes('zsh') ? '.zshrc' : '.bash_profile'
        configPath = `${homeDir}/${shellConfigFile}`
    }

    try {
      // 检查文件是否存在，如果不存在则创建
      try {
        if (this.platform === 'win32') {
          await execAsync(`if not exist "${configPath}" type nul > "${configPath}"`)
        }
        else {
          await execAsync(`test -f "${configPath}"`)
        }
      }
      catch {
        console.log(`创建配置文件: ${configPath}`)
        if (this.platform === 'win32') {
          await execAsync(`type nul > "${configPath}"`)
        }
        else {
          await execAsync(`touch "${configPath}"`)
          // 确保文件有正确的权限
          await execAsync(`chmod 644 "${configPath}"`)
        }
      }

      if (settings.enabled && settings.host && settings.port) {
        const proxyUrl = `http://${settings.host}:${settings.port}`
        const proxyConfig = generateProxyConfig(proxyUrl)

        console.log('准备更新代理配置:', {
          configPath,
          proxyUrl,
        })

        // 检查是否已经存在代理配置
        try {
          let command: string
          if (this.platform === 'win32') {
            command = `findstr /c:"${PROXY_CONFIG_BEGIN}" "${configPath}"`
          }
          else {
            // 使用 cat 和 grep 组合来避免权限问题
            command = `cat "${configPath}" | grep -c "${PROXY_CONFIG_BEGIN}"`
          }
          const { stdout } = await execAsync(command)
          const count = this.platform === 'win32' ? stdout.split('\n').length : Number.parseInt(stdout)
          console.log('现有配置数量:', count)

          if (count === 0) {
            console.log('添加新的代理配置')
            if (this.platform === 'win32') {
              await execAsync(`echo ${proxyConfig} >> "${configPath}"`)
            }
            else {
              // 使用 tee 命令来确保正确的文件权限
              await execAsync(`echo '${proxyConfig}' | tee -a "${configPath}"`)
            }
          }
          else {
            console.log('更新现有代理配置')
            // 删除旧的配置
            if (this.platform === 'win32') {
              // Windows 下使用 PowerShell 删除配置并保留注释标记
              await execAsync(`powershell -Command "$content = Get-Content '${configPath}'; $start = $content | Select-String -Pattern '${PROXY_CONFIG_BEGIN}' | Select-Object -First 1 -ExpandProperty LineNumber; $end = $content | Select-String -Pattern '${PROXY_CONFIG_END}' | Select-Object -First 1 -ExpandProperty LineNumber; if ($start -and $end) { $content[0..($start-2)] + '${PROXY_CONFIG_BEGIN}' + '${PROXY_CONFIG_END}' + $content[$end..($content.Length-1)] | Set-Content '${configPath}' }"`)
            }
            else {
              // 使用 sed 删除配置并保留注释标记
              const tempFile = `${configPath}.tmp`
              await execAsync(`sed '/${PROXY_CONFIG_BEGIN}/,/${PROXY_CONFIG_END}/c\\
${PROXY_CONFIG_BEGIN}\\
${PROXY_CONFIG_END}
' "${configPath}" > "${tempFile}"`)
              await execAsync(`mv "${tempFile}" "${configPath}"`)
            }
            // 添加新的配置
            if (this.platform === 'win32') {
              const proxyConfigArray = generateProxyConfigArray(proxyUrl).map(line => line.replace(/"/g, '\\"'))
              await execAsync(`powershell -Command "$content = Get-Content '${configPath}'; $start = $content | Select-String -Pattern '${PROXY_CONFIG_BEGIN}' | Select-Object -First 1 -ExpandProperty LineNumber; if ($start) { $content[0..($start-1)] + @('${PROXY_CONFIG_BEGIN}', '${proxyConfigArray.join('\', \'')}', '${PROXY_CONFIG_END}') + $content[($start+1)..($content.Length-1)] | Set-Content '${configPath}' }"`)
            }
            else {
              await execAsync(`sed -i '' '/${PROXY_CONFIG_BEGIN}/,/${PROXY_CONFIG_END}/c\\
${PROXY_CONFIG_BEGIN}\\
${generateProxyConfigArray(proxyUrl).join('\\\n')}\\
${PROXY_CONFIG_END}' "${configPath}"`)
            }
          }
        }
        catch (error) {
          console.error('检查或更新代理配置失败:', error)
          // 如果检查失败，直接添加新配置
          if (this.platform === 'win32') {
            await execAsync(`echo ${proxyConfig} >> "${configPath}"`)
          }
          else {
            await execAsync(`echo '${proxyConfig}' | tee -a "${configPath}"`)
          }
        }
      }
      else {
        console.log('删除代理配置')
        // 删除代理配置但保留注释标记
        try {
          if (this.platform === 'win32') {
            // Windows 下使用 PowerShell 删除配置并保留注释标记
            await execAsync(`powershell -Command "$content = Get-Content '${configPath}'; \\
            $start = $content | Select-String -Pattern '${PROXY_CONFIG_BEGIN}' | Select-Object -First 1 -ExpandProperty LineNumber; \\
            $end = $content | Select-String -Pattern '${PROXY_CONFIG_END}' | Select-Object -First 1 -ExpandProperty LineNumber; \\if ($start -and $end) { $content[0..($start-2)] + '${PROXY_CONFIG_BEGIN}' + '${PROXY_CONFIG_END}' + $content[$end..($content.Length-1)] | Set-Content '${configPath}' }"`)
          }
          else {
            // 使用 sed 删除配置并保留注释标记
            const tempFile = `${configPath}.tmp`
            await execAsync(`sed '/${PROXY_CONFIG_BEGIN}/,/${PROXY_CONFIG_END}/c\\
${PROXY_CONFIG_BEGIN}\\
${PROXY_CONFIG_END}
' "${configPath}" > "${tempFile}"`)
            await execAsync(`mv "${tempFile}" "${configPath}"`)
          }
        }
        catch (error) {
          console.error('删除代理配置失败:', error)
        }
      }
    }
    catch (error) {
      console.error('更新环境变量失败:', error)
    }
  }

  public getCurrentSettings(): ProxySettings {
    return this.currentSettings
  }

  public async getEnvStatus(): Promise<{ enabled: boolean, proxyUrl?: string }> {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE
      if (!homeDir) {
        return { enabled: false }
      }

      const shellConfigFile = this.platform === 'win32'
        ? '.bash_profile'
        : process.env.SHELL?.includes('zsh')
          ? '.zshrc'
          : '.bash_profile'

      const configPath = this.platform === 'win32'
        ? `${homeDir}\\${shellConfigFile}`
        : `${homeDir}/${shellConfigFile}`

      try {
        const { stdout } = await execAsync(`cat "${configPath}" | grep "export http_proxy"`)
        if (stdout) {
          const match = stdout.match(/export http_proxy="(.+)"/)
          return {
            enabled: true,
            proxyUrl: match?.[1],
          }
        }
      }
      catch {
        // 如果没有找到配置，返回未启用状态
        return { enabled: false }
      }

      return { enabled: false }
    }
    catch (error) {
      console.error('获取环境变量状态失败:', error)
      return { enabled: false }
    }
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
}

export default ProxyManager

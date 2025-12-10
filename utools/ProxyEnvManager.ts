import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import process from 'node:process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const platform = os.platform()

const ENV_VARS = ['all_proxy', 'http_proxy', 'https_proxy'] as const
export type ENV_VAR = (typeof ENV_VARS)[number]
export type ProxyEnv = Record<ENV_VAR, string>

const PROXY_CONFIG_BEGIN = '# BEGIN: ProxyEnvSync Configuration'
const PROXY_CONFIG_END = '# END: ProxyEnvSync Configuration'

function getConfigPath(): string {
  const homeDir = utools.getPath('home')
  if (!homeDir) {
    throw new Error('Home directory not found')
  }

  if (platform === 'win32') {
    return `${homeDir}\\.bash_profile`
  }

  if (platform === 'darwin') {
    const shell = process.env.SHELL || ''
    if (shell.endsWith('bash')) {
      return `${homeDir}/.bash_profile`
    }
    // 默认为 .zshrc (macOS 默认 Shell)
    return `${homeDir}/.zshrc`
  }

  throw new Error('Unsupported platform')
}

function generateProxyConfig(proxyUrl: string): string {
  const quote = platform === 'win32' ? '`' : '"'
  return `${PROXY_CONFIG_BEGIN}\n${ENV_VARS.map(env => `export ${env}=${quote}${proxyUrl}${quote}`).join('\n')}\n${PROXY_CONFIG_END}`
}

export const setProxyEnv: (proxyUrl: string | null) => Promise<void> = (() => {
  async function windows_setProxyEnv(proxyUrl: string | null) {
    if (proxyUrl) {
      for (const env of ENV_VARS) {
        try {
          await execAsync(`setx ${env} ${proxyUrl}`)
        }
        catch (error) {
          console.error(`Failed to set ${env}:`, error)
        }
      }
    }
    else {
      for (const env of ENV_VARS) {
        try {
          await execAsync(`reg delete HKCU\\Environment /F /V ${env}`)
        }
        catch {
          // 未设置时 reg delete 会报错，忽略即可
        }
      }
    }
  }

  async function mac_setProxyEnv(proxyUrl: string | null) {
    const configPath = getConfigPath()
    let content = ''
    if (existsSync(configPath)) {
      content = await fs.readFile(configPath, 'utf-8')
    }
    // 移除旧配置
    const begin = content.indexOf(PROXY_CONFIG_BEGIN)
    const end = content.indexOf(PROXY_CONFIG_END)
    if (begin !== -1 && end !== -1 && begin < end) {
      // 查找配置块开始前的换行符位置
      let beforeBegin = begin
      while (beforeBegin > 0 && content[beforeBegin - 1] === '\n') {
        beforeBegin--
      }

      // 查找配置块结束后的换行符位置
      let afterEnd = end + PROXY_CONFIG_END.length
      while (afterEnd < content.length && content[afterEnd] === '\n') {
        afterEnd++
      }

      // 移除配置块及其前后的换行符，但保留一个换行符（如果原本就有的话）
      const beforeContent = content.slice(0, beforeBegin)
      const afterContent = content.slice(afterEnd)

      // 如果移除后前面有内容且后面也有内容，确保它们之间有适当的分隔
      if (beforeContent && afterContent && !beforeContent.endsWith('\n')) {
        content = `${beforeContent}\n${afterContent}`
      }
      else {
        content = beforeContent + afterContent
      }
    }
    if (proxyUrl) {
      const proxyConfig = generateProxyConfig(proxyUrl)
      content += `${(content.endsWith('\n') ? '' : '\n') + proxyConfig}\n`
    }
    await fs.writeFile(configPath, content, 'utf-8')
  }
  switch (platform) {
    case 'win32':
      return windows_setProxyEnv
    case 'darwin':
      return mac_setProxyEnv
    default:
      throw new Error('Unsupported platform')
  }
})()

export const getProxyEnv: () => Promise<ProxyEnv> = (() => {
  function parseProxyEnv(content: string): ProxyEnv {
    const begin = content.indexOf(PROXY_CONFIG_BEGIN)
    const end = content.indexOf(PROXY_CONFIG_END)
    if (begin === -1 || end === -1 || begin >= end) {
      return ENV_VARS.reduce((acc, env) => {
        acc[env] = ''
        return acc
      }, {} as ProxyEnv)
    }
    const configContent = content.slice(begin, end)
    const quote = platform === 'win32' ? '`' : '"'
    const result = ENV_VARS.reduce((acc, env) => {
      const regex = new RegExp(`export\\s+${env}=${quote}([^${quote}]+)${quote}`)
      const match = configContent.match(regex)
      return { ...acc, [env]: match ? match[1] : '' }
    }, {} as ProxyEnv)
    return result
  }
  async function windows_getProxyEnv(): Promise<ProxyEnv> {
    const result: ProxyEnv = {
      all_proxy: '',
      http_proxy: '',
      https_proxy: '',
    }

    for (const env of ENV_VARS) {
      try {
        const { stdout } = await execAsync(`reg query HKCU\\Environment /v ${env}`)
        // 解析类似于：ENV_NAME    REG_SZ    value
        const match = stdout.match(/REG_SZ\s+([^\r\n]+)/)
        if (match) {
          result[env] = match[1].trim()
        }
      }
      catch {
        // 未设置时reg query会报错，忽略即可
        result[env] = ''
      }
    }
    return result
  }
  async function mac_getProxyEnv(): Promise<ProxyEnv> {
    const configPath = getConfigPath()
    if (!existsSync(configPath)) {
      return ENV_VARS.reduce((acc, env) => {
        acc[env] = ''
        return acc
      }, {} as ProxyEnv)
    }
    const content = await fs.readFile(configPath, 'utf-8')
    return parseProxyEnv(content)
  }
  switch (platform) {
    case 'win32':
      return windows_getProxyEnv
    case 'darwin':
      return mac_getProxyEnv
    default:
      throw new Error('Unsupported platform')
  }
})()

export interface ProxySettings {
  enabled: boolean
  host: string
  port: string
}

export const getSystemProxy: () => Promise<ProxySettings> = (() => {
  async function windows_getSystemProxy(): Promise<ProxySettings> {
    const result: ProxySettings = {
      enabled: false,
      host: '',
      port: '',
    }
    try {
      // 使用 powershell 获取代理设置
      const command = 'powershell -Command "Get-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\' | Select-Object ProxyEnable,ProxyServer | ConvertTo-Json"'
      const { stdout } = await execAsync(command)
      const proxySettings = JSON.parse(stdout)
      result.enabled = proxySettings.ProxyEnable === 1
      if (proxySettings.ProxyServer) {
        const [proxyHost, proxyPort] = proxySettings.ProxyServer.split(':')
        result.host = proxyHost
        result.port = proxyPort
      }
    }
    catch (error) {
      console.error('Failed to get Windows system proxy:', error)
    }
    return result
  }
  async function mac_getSystemProxy(): Promise<ProxySettings> {
    const result: ProxySettings = {
      enabled: false,
      host: '',
      port: '',
    }
    try {
      const { stdout: routeOutput } = await execAsync('route get default | grep interface')
      const iface = routeOutput.match(/interface:\s+(\S+)/)?.[1]
      if (!iface) {
        throw new Error('获取默认接口失败')
      }

      const { stdout: portsInfo } = await execAsync('networksetup -listallhardwareports')
      const serviceMatch = portsInfo
        .split(/\n{2,}/)
        .find((block: string) => block.includes(`Device: ${iface}`))
        ?.match(/Hardware Port: (.+)/)
      if (!serviceMatch) {
        throw new Error('获取服务名失败')
      }

      const serviceName = serviceMatch[1].trim()
      const { stdout: proxyRaw } = await execAsync(`networksetup -getwebproxy "${serviceName}"`)
      const proxyKeys = ['Enabled', 'Server', 'Port'] as const
      const proxy = proxyRaw.split('\n').reduce((acc: Record<string, string>, line: string) => {
        const [key, value] = line.split(':').map((s: string) => s.trim())
        if (key && value) {
          acc[key] = value
        }
        return acc
      }, {} as Record<(typeof proxyKeys)[number], string>)

      if (!proxyKeys.every(key => key in proxy)) {
        throw new Error('获取代理设置失败')
      }

      result.enabled = proxy.Enabled === 'Yes'
      if (proxy.Server && proxy.Port) {
        result.host = proxy.Server
        result.port = proxy.Port
      }
      return result
    }
    catch (error) {
      console.error(error)
      return result
    }
  }
  switch (platform) {
    case 'win32':
      return windows_getSystemProxy
    case 'darwin':
      return mac_getSystemProxy
    default:
      throw new Error('Unsupported platform')
  }
})()

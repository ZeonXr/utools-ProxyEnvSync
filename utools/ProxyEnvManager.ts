import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import process from 'node:process'

const platform = os.platform()

const ENV_VARS = ['all_proxy', 'http_proxy', 'https_proxy'] as const
export type ENV_VAR = (typeof ENV_VARS)[number]

const PROXY_CONFIG_BEGIN = '# BEGIN: ProxyEnvSync Configuration'
const PROXY_CONFIG_END = '# END: ProxyEnvSync Configuration'

function getConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE
  if (!homeDir) {
    throw new Error('Home directory not found')
  }
  let configPath: string
  switch (platform) {
    case 'win32':
      configPath = `${homeDir}\\.bash_profile`
      break
    case 'darwin':
      configPath = `${homeDir}/.zshrc`
      break
    default:
      throw new Error('Unsupported platform')
  }
  return configPath
}

function generateProxyConfig(proxyUrl: string): string {
  const quote = platform === 'win32' ? '`' : '"'
  return `${PROXY_CONFIG_BEGIN}\n${ENV_VARS.map(env => `export ${env}=${quote}${proxyUrl}${quote}`).join('\n')}\n${PROXY_CONFIG_END}`
}

export const setProxyEnv: (proxyUrl: string | null) => void = (() => {
  function windows_setProxyEnv(proxyUrl: string | null) {
    if (proxyUrl) {
      ENV_VARS.forEach((env) => {
        execSync(`setx ${env} ${proxyUrl}`, { stdio: 'ignore' })
      })
    }
    else {
      ENV_VARS.forEach((env) => {
        try {
          execSync(`reg delete HKCU\\Environment /F /V ${env}`, { stdio: 'ignore' })
        }
        catch {}
      })
    }
  }

  function mac_setProxyEnv(proxyUrl: string | null) {
    const configPath = getConfigPath()
    let content = ''
    if (fs.existsSync(configPath)) {
      content = fs.readFileSync(configPath, 'utf-8')
    }
    // 移除旧配置
    const begin = content.indexOf(PROXY_CONFIG_BEGIN)
    const end = content.indexOf(PROXY_CONFIG_END)
    if (begin !== -1 && end !== -1 && begin < end) {
      content = content.slice(0, begin) + content.slice(end + PROXY_CONFIG_END.length)
    }
    if (proxyUrl) {
      const proxyConfig = generateProxyConfig(proxyUrl)
      content += `${(content.endsWith('\n') ? '' : '\n') + proxyConfig}\n`
    }
    fs.writeFileSync(configPath, content, 'utf-8')
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

export const getProxyEnv: () => Record<ENV_VAR, string> = (() => {
  function parseProxyEnv(content: string): Record<ENV_VAR, string> {
    const begin = content.indexOf(PROXY_CONFIG_BEGIN)
    const end = content.indexOf(PROXY_CONFIG_END)
    if (begin === -1 || end === -1 || begin >= end) {
      return ENV_VARS.reduce((acc, env) => {
        acc[env] = ''
        return acc
      }, {} as Record<ENV_VAR, string>)
    }
    const configContent = content.slice(begin, end)
    const quote = platform === 'win32' ? '`' : '"'
    const result = ENV_VARS.reduce((acc, env) => {
      const regex = new RegExp(`export\\s+${env}=${quote}([^${quote}]+)${quote}`)
      const match = configContent.match(regex)
      return { ...acc, [env]: match ? match[1] : '' }
    }, {} as Record<ENV_VAR, string>)
    return result
  }
  function windows_getProxyEnv() {
    const result: Record<ENV_VAR, string> = {
      all_proxy: '',
      http_proxy: '',
      https_proxy: '',
    }
    ENV_VARS.forEach((env) => {
      try {
        const output = execSync(`reg query HKCU\\Environment /v ${env}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        })
        // 解析类似于：ENV_NAME    REG_SZ    value
        const match = output.match(/REG_SZ\s+([^\r\n]+)/)
        if (match) {
          result[env] = match[1].trim()
        }
      }
      catch {
        // 未设置时reg query会报错，忽略即可
        result[env] = ''
      }
    })
    return result
  }
  function mac_getProxyEnv() {
    const configPath = getConfigPath()
    if (!fs.existsSync(configPath)) {
      return ENV_VARS.reduce((acc, env) => {
        acc[env] = ''
        return acc
      }, {} as Record<ENV_VAR, string>)
    }
    const content = fs.readFileSync(configPath, 'utf-8')
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

export const getSystemProxy: () => ProxySettings = (() => {
  function windows_getSystemProxy(): ProxySettings {
    const result: ProxySettings = {
      enabled: false,
      host: '',
      port: '',
    }
    // 使用 powershell 获取代理设置
    const command = 'powershell -Command "Get-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\' | Select-Object ProxyEnable,ProxyServer | ConvertTo-Json"'
    const winStdout = execSync(command, { encoding: 'utf-8' })
    const proxySettings = JSON.parse(winStdout)
    result.enabled = proxySettings.ProxyEnable === 1
    if (proxySettings.ProxyServer) {
      const [proxyHost, proxyPort] = proxySettings.ProxyServer.split(':')
      result.host = proxyHost
      result.port = proxyPort
    }
    return result
  }
  function mac_getSystemProxy(): ProxySettings {
    const result: ProxySettings = {
      enabled: false,
      host: '',
      port: '',
    }
    try {
      const iface = execSync('route get default | grep interface')
        .toString()
        .match(/interface:\s+(\S+)/)?.[1]
      if (!iface) {
        throw new Error('获取默认接口失败')
      }
      const portsInfo = execSync('networksetup -listallhardwareports').toString()
      const serviceMatch = portsInfo
        .split(/\n{2,}/)
        .find(block => block.includes(`Device: ${iface}`))
        ?.match(/Hardware Port: (.+)/)
      if (!serviceMatch) {
        throw new Error('获取服务名失败')
      }
      const serviceName = serviceMatch[1].trim()
      const proxyRaw = execSync(`networksetup -getwebproxy "${serviceName}"`).toString()
      const proxyKeys = ['Enabled', 'Server', 'Port'] as const
      const proxy = proxyRaw.split('\n').reduce((acc, line) => {
        const [key, value] = line.split(':').map(s => s.trim())
        if (key && value) {
          acc[key as keyof typeof acc] = value
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

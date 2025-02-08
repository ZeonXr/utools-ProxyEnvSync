// 您可以在进行窗口交互
// utools文档

// https://www.u.tools/docs/developer/api.html#%E7%AA%97%E5%8F%A3%E4%BA%A4%E4%BA%92
// window.versions={
//     node: () => process.versions.node,
//     chrome: () => process.versions.chrome,
//     electron: () => process.versions.electron
// }

import { exec } from 'child_process'
import os from 'os'

// 记录上一次的代理状态，避免重复触发
let lastProxy:string | null = ''

// 获取 Windows 代理
function getWindowsProxy(callback: (proxy: string | null) => void) {
  exec(
    'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
    (err, stdout) => {
      if (err) return callback(null)
      const match = stdout.match(/ProxyServer\s+REG_SZ\s+(.+)/)
      callback(match ? match[1] : null)
    }
  )
}

// 获取 Windows 全局代理（WinHTTP）
function getWindowsWinHttpProxy(callback: (proxy: string | null) => void) {
  exec('netsh winhttp show proxy', (err, stdout) => {
    if (err) return callback(null)
    callback(stdout.includes('Direct access') ? null : stdout.trim())
  })
}

// 获取 macOS 代理
function getMacProxy(callback: (proxy: string | null) => void) {
  exec('networksetup -getwebproxy Wi-Fi', (err, stdout) => {
    if (err) return callback(null)
    const match = stdout.match(/Server: (.+)\nPort: (\d+)/)
    callback(match ? `${match[1]}:${match[2]}` : null)
  })
}

// 获取 Linux (GNOME) 代理
function getLinuxProxy(callback: (proxy: string | null) => void) {
  exec('gsettings get org.gnome.system.proxy mode', (err, stdout) => {
    if (err) return callback(null)
    if (stdout.trim() === "'manual'") {
      exec('gsettings get org.gnome.system.proxy.http host', (_, host) => {
        exec('gsettings get org.gnome.system.proxy.http port', (_, port) => {
          callback(`${host.trim()}:${port.trim()}`)
        })
      })
    } else {
      callback(null)
    }
  })
}

// 监听代理变化（轮询，每 5 秒检测一次）
function checkProxy() {
  const platform = os.platform()

  let getProxyFunc
  if (platform === 'win32') {
    getProxyFunc = getWindowsProxy // 可改为 getWindowsWinHttpProxy 监听全局代理
  } else if (platform === 'darwin') {
    getProxyFunc = getMacProxy
  } else if (platform === 'linux') {
    getProxyFunc = getLinuxProxy
  } else {
    console.log('不支持的操作系统')
    return
  }

  getProxyFunc((proxy) => {
    if (proxy && proxy !== lastProxy) {
      console.log('代理已更改:', proxy)
      lastProxy = proxy
      utools.showNotification(`系统代理变更: ${proxy}`)
    }
  })
}

// 定时轮询（每 5 秒检测一次）
setInterval(checkProxy, 5000)
checkProxy() // 立即执行一次

export const customApis = {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  getProxy: () => lastProxy,
}

window.customApis = customApis

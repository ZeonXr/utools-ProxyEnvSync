// https://www.u-tools.cn/docs/developer/docs.html
import type { ProxySettings } from './proxyManager'
import ProxyManager from './proxyManager'

const proxyManager = ProxyManager.getInstance()

// 启动代理监控
proxyManager.startMonitoring()

export const customApis = {
  getCurrentSettings: () => proxyManager.getCurrentSettings(),
  onSettingsChange: (callback: (settings: ProxySettings) => void) => {
    proxyManager.onSettingsChange(callback)
    return () => proxyManager.removeSettingsChangeListener(callback)
  },
}

window.customApis = customApis

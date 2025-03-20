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
  getEnvStatus: () => proxyManager.getEnvStatus(),
  setSyncEnabled: async (enabled: boolean) => {
    await proxyManager.setSyncEnabled(enabled)
  },
  getSyncEnabled: () => proxyManager.getSyncEnabled(),
  stopMonitoring: () => proxyManager.stopMonitoring(),
}

declare global {
  interface Window {
    customApis: typeof customApis
  }
}

window.customApis = customApis

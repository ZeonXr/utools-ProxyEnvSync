// https://www.u-tools.cn/docs/developer/docs.html
import ProxyManager from './controller'

const proxyManager = ProxyManager.getInstance()

// 启动代理监控
proxyManager.startMonitoring()

// // 定义要暴露给渲染进程的 API
// export const customApis = {
//   // 获取当前系统代理设置
//   getCurrentSettings: () => proxyManager.getCurrentSettings(),

//   // 获取环境变量状态
//   getEnvStatus: () => proxyManager.getEnvStatus(),

//   // 设置同步状态
//   setSyncEnabled: (enabled: boolean) => proxyManager.setSyncEnabled(enabled),

//   // 获取同步状态
//   getSyncEnabled: () => proxyManager.getSyncEnabled(),

//   // 设置检查间隔
//   setCheckInterval: (intervalMs: number) => proxyManager.setCheckInterval(intervalMs),

//   // 获取检查间隔
//   getCheckInterval: () => proxyManager.getCheckInterval(),

//   // 设置通知状态
//   setNotificationEnabled: (enabled: boolean) => proxyManager.setNotificationEnabled(enabled),

//   // 获取通知状态
//   getNotificationEnabled: () => proxyManager.getNotificationEnabled(),

//   // 监听设置变化
//   onSettingsChange: (callback: (settings: any) => void) => {
//     proxyManager.onSettingsChange(callback)
//     return () => proxyManager.removeSettingsChangeListener(callback)
//   },
// }

window.proxyManager = proxyManager

// 插件退出时清除环境变量
utools.onPluginOut(async (isKill: boolean) => {
  if (isKill) {
    await proxyManager.clearProxyEnv()
  }
})

declare global {
  interface Window {
    proxyManager: typeof proxyManager
  }
}

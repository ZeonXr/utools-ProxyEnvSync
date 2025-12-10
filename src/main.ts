import { createApp } from 'vue'
import App from './App.vue'
import 'virtual:uno.css'

let app: ReturnType<typeof createApp> | null = null

const { Monitor, PluginSettings } = window.proxyManager
function mountApp(containerSelector = '#app') {
  if (app) {
    return app
  }
  app = createApp(App)
  app.mount(containerSelector)
  return app
}

function unmountApp() {
  if (app) {
    app.unmount()
    app = null
  }
}
mountApp()
utools.onPluginEnter(() => {
  if (!Monitor.isRunning()) {
    Monitor.start()
  }
  mountApp()
})

utools.onPluginOut(() => {
  if (!PluginSettings.get('syncEnabled')) {
    Monitor.stop()
  }
  unmountApp()
})

import { createApp } from 'vue'
import App from './App.vue'
import 'virtual:uno.css'

let app: ReturnType<typeof createApp> | null = null

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
  mountApp()
})

utools.onPluginOut(() => {
  unmountApp()
})

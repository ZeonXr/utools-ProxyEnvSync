import type { customApis } from './utools/preload'

declare global {
  interface Window {
    customApis: typeof customApis
  }
}

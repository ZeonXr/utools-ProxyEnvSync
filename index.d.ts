// export interface ProcessVersions {
//     node: () => string;
//     chrome: () => string;
//     electron: () => string;
// }

import type { customApis } from './utools/preload'

declare global {
    interface Window {
      customApis: typeof customApis;
    }
  }
   
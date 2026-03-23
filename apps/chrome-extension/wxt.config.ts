import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'wxt'

const appRoot = fileURLToPath(new URL('.', import.meta.url))
const manualRunner = process.env.MDP_WXT_MANUAL === '1'

export default defineConfig({
  outDir: 'dist',
  webExt: {
    ...(manualRunner
      ? {
          disabled: true
        }
      : {
          chromiumProfile: resolve(appRoot, '.wxt/chrome-data'),
          keepProfileChanges: true
        })
  },
  manifest: {
    name: 'Model Drive Protocol for Chrome',
    short_name: 'MDP Chrome',
    description: 'Connect Chrome tabs, extension actions, and page-local tools to Model Drive Protocol.',
    author: 'Model Drive Protocol',
    homepage_url: 'https://github.com/modeldriveprotocol/modeldriveprotocol',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png'
    },
    permissions: ['storage', 'scripting', 'tabs', 'activeTab', 'notifications'],
    optional_host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Model Drive Protocol for Chrome',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png'
      }
    }
  },
  vite: () => ({
    resolve: {
      alias: {
        '@modeldriveprotocol/client': resolve(appRoot, '../../packages/client/src/index.ts'),
        '@modeldriveprotocol/protocol': resolve(appRoot, '../../packages/protocol/src/index.ts')
      }
    }
  })
})

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
    name: 'MDP Chrome Extension',
    description: 'Expose Chrome extension abilities and page-local injected tools through Model Drive Protocol.',
    permissions: ['storage', 'scripting', 'tabs', 'activeTab', 'notifications'],
    optional_host_permissions: ['<all_urls>'],
    action: {
      default_title: 'MDP Chrome Extension'
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

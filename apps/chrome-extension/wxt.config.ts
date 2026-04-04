import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'wxt'

const appRoot = fileURLToPath(new URL('.', import.meta.url))
const manualRunner = process.env.MDP_WXT_MANUAL === '1'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
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
    default_locale: 'en',
    name: '__MSG_appName__',
    short_name: '__MSG_appShortName__',
    description: '__MSG_appDescription__',
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
      default_title: '__MSG_appActionTitle__',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png'
      }
    }
  },
  vite: () => ({
    resolve: {
      alias: [
        {
          find: /^#~\/(.*)\.js$/,
          replacement: resolve(appRoot, 'src/$1')
        },
        {
          find: '#~',
          replacement: resolve(appRoot, 'src')
        },
        {
          find: /^@modeldriveprotocol\/client\/(.*)$/,
          replacement: resolve(appRoot, '../../packages/client/src/$1.ts')
        },
        {
          find: '@modeldriveprotocol/client',
          replacement: resolve(appRoot, '../../packages/client/src/index.ts')
        },
        {
          find: '@modeldriveprotocol/protocol',
          replacement: resolve(appRoot, '../../packages/protocol/src/index.ts')
        }
      ]
    },
    build: {
      chunkSizeWarningLimit: 550
    }
  })
})

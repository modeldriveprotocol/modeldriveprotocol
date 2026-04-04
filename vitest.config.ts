import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@modeldriveprotocol\/client\/(.*)$/,
        replacement: fileURLToPath(
          new URL('./packages/client/src/$1.ts', import.meta.url)
        )
      },
      {
        find: '@modeldriveprotocol/protocol',
        replacement: fileURLToPath(
          new URL('./packages/protocol/src/index.ts', import.meta.url)
        )
      },
      {
        find: '@modeldriveprotocol/client',
        replacement: fileURLToPath(
          new URL('./packages/client/src/index.ts', import.meta.url)
        )
      },
      {
        find: '@modeldriveprotocol/server',
        replacement: fileURLToPath(
          new URL('./packages/server/src/index.ts', import.meta.url)
        )
      }
    ]
  },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true
  }
})

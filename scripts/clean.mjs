import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const targets = [
  'packages/protocol/dist',
  'packages/client/dist',
  'packages/server/dist',
  'packages/server/runtime-docs',
  'apps/browser-simple-mdp-client/dist',
  'apps/chrome-extension/dist',
  'apps/vscode-extension/dist',
  'packages/protocol/tsconfig.tsbuildinfo',
  'packages/client/tsconfig.tsbuildinfo',
  'packages/server/tsconfig.tsbuildinfo',
  'apps/browser-simple-mdp-client/tsconfig.tsbuildinfo',
  'apps/chrome-extension/tsconfig.tsbuildinfo',
  'apps/vscode-extension/tsconfig.tsbuildinfo',
  'docs/.vitepress/cache',
  'docs/.vitepress/dist',
  'docs/public/assets/mdp-client.global.js',
  'docs/public/assets/mdp-client.global.js.map',
  'docs/public/assets/modeldriveprotocol-client.global.js',
  'docs/public/assets/modeldriveprotocol-client.global.js.map',
  'docs/public/assets/browser-simple-mdp-client.global.js',
  'docs/public/assets/browser-simple-mdp-client.global.js.map'
]

await Promise.all(
  targets.map((target) =>
    rm(resolve(process.cwd(), target), {
      force: true,
      recursive: true
    })
  )
)

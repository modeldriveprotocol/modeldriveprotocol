import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const moduleDir = dirname(fileURLToPath(import.meta.url))
const exampleRoot = resolve(moduleDir, '..')
const repoRoot = resolve(exampleRoot, '../..')

const port = Number(process.env.MDP_PORT ?? 7070)

export const paths = {
  exampleRoot,
  repoRoot,
  serverCliPath: resolve(repoRoot, 'packages/server/dist/cli.js'),
  runtimeIndexPath: resolve(repoRoot, 'apps/nodejs-simple-mdp-client/dist/index.js')
}

export const defaults = {
  port,
  serverUrl: `ws://127.0.0.1:${port}`,
  runtimeClientId: process.env.MDP_RUNTIME_CLIENT_ID ?? 'mdp-test-runtime',
  mcpServer: {
    name: 'mdp',
    version: '1.0.0'
  }
}

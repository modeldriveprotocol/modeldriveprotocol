import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const clientEntry = path.join(appRoot, '../../packages/client/src/index.ts')
const clientNodeEntry = path.join(appRoot, '../../packages/client/src/node.ts')
const protocolEntry = path.join(appRoot, '../../packages/protocol/src/index.ts')

await build({
  entryPoints: [path.join(appRoot, 'src/index.ts')],
  outfile: path.join(appRoot, 'dist/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  sourcemap: true,
  target: 'node18',
  alias: {
    '@modeldriveprotocol/client/node': clientNodeEntry,
    '@modeldriveprotocol/client': clientEntry,
    '@modeldriveprotocol/protocol': protocolEntry
  }
})

await build({
  entryPoints: [path.join(appRoot, 'src/cli.ts')],
  outfile: path.join(appRoot, 'dist/cli.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  sourcemap: true,
  target: 'node18',
  alias: {
    '@modeldriveprotocol/client/node': clientNodeEntry,
    '@modeldriveprotocol/client': clientEntry,
    '@modeldriveprotocol/protocol': protocolEntry
  }
})

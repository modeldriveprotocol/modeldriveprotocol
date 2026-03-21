import { build } from 'esbuild'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')

await build({
  entryPoints: [resolve(packageRoot, 'dist/global.js')],
  outfile: resolve(packageRoot, 'dist/modeldriveprotocol-client.global.js'),
  bundle: true,
  format: 'iife',
  globalName: 'MDP',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  banner: {
    js: '/* Model Drive Protocol browser bundle */'
  }
})

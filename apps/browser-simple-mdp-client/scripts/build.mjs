import { build } from 'esbuild'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(__dirname, '..')

await build({
  entryPoints: [resolve(appRoot, 'src/index.ts')],
  outfile: resolve(appRoot, 'dist/browser-simple-mdp-client.global.js'),
  bundle: true,
  format: 'iife',
  globalName: 'MDPSimpleBrowserClient',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  banner: {
    js: '/* Model Drive Protocol simple browser client */'
  }
})

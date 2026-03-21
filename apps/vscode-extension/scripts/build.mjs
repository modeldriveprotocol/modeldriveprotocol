import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build, context as createBuildContext } from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const outfile = resolve(appRoot, 'dist/extension.js')
const watch = process.argv.includes('--watch')

await mkdir(dirname(outfile), { recursive: true })

const buildOptions = {
  entryPoints: [resolve(appRoot, 'src/extension.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile,
  sourcemap: true,
  external: ['vscode'],
  tsconfig: resolve(appRoot, 'tsconfig.json')
}

if (!watch) {
  await build(buildOptions)
} else {
  const context = await createBuildContext(buildOptions)
  const shutdown = async () => {
    await context.dispose()
    process.exit(0)
  }

  process.on('SIGINT', () => {
    void shutdown()
  })
  process.on('SIGTERM', () => {
    void shutdown()
  })

  await context.watch()
  console.log('Watching apps/vscode-extension for changes.')
  await new Promise(() => undefined)
}

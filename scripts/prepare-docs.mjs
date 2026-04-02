import { copyFile, cp, mkdir, rm } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import './sync-generated-docs.mjs'

const root = process.cwd()
const sourceBundle = resolve(root, 'packages/client/dist/modeldriveprotocol-client.global.js')
const sourceMap = resolve(
  root,
  'packages/client/dist/modeldriveprotocol-client.global.js.map'
)
const sourceSimpleBundle = resolve(
  root,
  'apps/browser-simple-mdp-client/dist/browser-simple-mdp-client.global.js'
)
const sourceSimpleMap = resolve(
  root,
  'apps/browser-simple-mdp-client/dist/browser-simple-mdp-client.global.js.map'
)
const targetDir = resolve(root, 'docs/public/assets')
const sourceExamplesDir = resolve(root, 'examples')
const targetExamplesDir = resolve(root, 'docs/public/examples')

function shouldCopyExamplePath(path) {
  const relativePath = relative(sourceExamplesDir, path)

  if (!relativePath) {
    return true
  }

  return !relativePath.split(sep).includes('node_modules')
}

await mkdir(targetDir, { recursive: true })
await copyFile(sourceBundle, resolve(targetDir, 'modeldriveprotocol-client.global.js'))
await copyFile(sourceMap, resolve(targetDir, 'modeldriveprotocol-client.global.js.map'))
await copyFile(sourceSimpleBundle, resolve(targetDir, 'browser-simple-mdp-client.global.js'))
await copyFile(sourceSimpleMap, resolve(targetDir, 'browser-simple-mdp-client.global.js.map'))
await rm(targetExamplesDir, { recursive: true, force: true })
await mkdir(targetExamplesDir, { recursive: true })
await cp(sourceExamplesDir, targetExamplesDir, {
  recursive: true,
  force: true,
  filter: shouldCopyExamplePath
})

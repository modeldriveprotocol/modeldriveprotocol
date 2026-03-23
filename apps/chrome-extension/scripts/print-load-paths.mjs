import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))

const productionBuildDir = resolve(appRoot, 'dist/chrome-mv3')
const manualDevDir = resolve(appRoot, 'dist/chrome-mv3-dev')
const persistentProfileDir = resolve(appRoot, '.wxt/chrome-data')

console.log('Chrome extension local paths')
console.log(`- manual dev load path: ${manualDevDir}`)
console.log(`- production-style build path: ${productionBuildDir}`)
console.log(`- WXT persistent dev profile: ${persistentProfileDir}`)

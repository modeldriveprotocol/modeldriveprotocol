import { access, cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const repositoryUrl = 'git+https://github.com/NWYLZW/mdp.git'
const repositoryDirectory = 'apps/vscode-extension'

export function getAppRoot() {
  return appRoot
}

export function getVsceBinaryPath() {
  return resolve(
    appRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'vsce.cmd' : 'vsce'
  )
}

export async function readSourceManifest() {
  return JSON.parse(
    await readFile(resolve(appRoot, 'package.json'), 'utf8')
  )
}

export function resolveExtensionPublisher(sourceManifest, environment = process.env) {
  const value = environment.VSCODE_EXTENSION_PUBLISHER?.trim()

  if (value) {
    return value
  }

  return 'localdev'
}

export function resolveExtensionName(sourceManifest) {
  const configured = sourceManifest.mdpRelease?.extensionName

  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim()
  }

  return 'mdp-vscode-extension'
}

export async function createReleaseStage(options = {}) {
  const sourceManifest = await readSourceManifest()
  const publisher = options.publisher ?? resolveExtensionPublisher(sourceManifest)
  const extensionName = options.extensionName ?? resolveExtensionName(sourceManifest)
  const version = sourceManifest.version
  const distDir = resolve(appRoot, 'dist')
  const readmePath = resolve(appRoot, 'README.md')
  const stageDir = await mkdtemp(resolve(tmpdir(), 'mdp-vscode-extension-'))

  await access(resolve(distDir, 'extension.js'))
  await cp(distDir, resolve(stageDir, 'dist'), {
    recursive: true
  })
  await cp(readmePath, resolve(stageDir, 'README.md'))

  const releaseManifest = {
    name: extensionName,
    publisher,
    version,
    displayName: sourceManifest.displayName,
    description: sourceManifest.description,
    type: sourceManifest.type,
    engines: sourceManifest.engines,
    categories: sourceManifest.categories,
    activationEvents: sourceManifest.activationEvents,
    main: sourceManifest.main,
    files: [
      'dist/**',
      'README.md'
    ],
    contributes: sourceManifest.contributes,
    repository: {
      type: 'git',
      url: repositoryUrl,
      directory: repositoryDirectory
    }
  }

  validateReleaseManifest(releaseManifest)

  await writeFile(
    resolve(stageDir, 'package.json'),
    JSON.stringify(releaseManifest, null, 2)
  )

  return {
    stageDir,
    cleanup: async () => {
      await rm(stageDir, {
        recursive: true,
        force: true
      })
    },
    manifest: releaseManifest
  }
}

export function resolveVsixPath(version, extensionName, outputPath) {
  return resolve(
    appRoot,
    outputPath ?? `${extensionName}-v${version}.vsix`
  )
}

function validateReleaseManifest(manifest) {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(manifest.name)) {
    throw new Error(
      `Invalid VSCode extension release name "${manifest.name}". Use lowercase letters, numbers, and dashes only.`
    )
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/u.test(manifest.publisher)) {
    throw new Error(
      `Invalid VSCode extension publisher "${manifest.publisher}". Set VSCODE_EXTENSION_PUBLISHER to a valid Marketplace publisher id.`
    )
  }
}

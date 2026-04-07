import type {
  RouteClientConfig,
  RouteClientRecording,
  RouteExposeAsset,
  RouteSelectorResource
} from '#~/shared/config.js'
import { ROOT_ROUTE_SKILL_PATH, isRootRouteSkillPath } from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../../../platform/extension-api.js'

import type { RouteRenameTarget } from './types.js'

export function resolveInitialAssetId(
  client: RouteClientConfig,
  initialPath: string | undefined,
  initialTab: OptionsAssetsTab | undefined,
  rootSkillId: string | undefined
): string | undefined {
  if (initialPath) {
    const matchedAsset = client.exposes.find(
      (asset) => asset.kind !== 'folder' && asset.path === initialPath
    )

    if (matchedAsset && matchedAsset.kind !== 'folder') {
      return matchedAsset.id
    }
  }

  if (initialTab === 'flows') {
    return client.recordings[0]?.id ?? rootSkillId
  }

  if (initialTab === 'resources') {
    return client.selectorResources[0]?.id ?? rootSkillId
  }

  return rootSkillId ?? client.skillEntries[0]?.id ?? client.exposes[0]?.id
}

export function createUniquePath(
  existingPaths: string[],
  parentPath: string,
  baseName: string
): string {
  const slug = slugifySegment(baseName) || 'asset'
  const prefix = parentPath ? `${parentPath}/${slug}` : slug
  let candidate = prefix
  let counter = 2
  const used = new Set(existingPaths)

  while (used.has(candidate)) {
    candidate = `${prefix}-${counter}`
    counter += 1
  }

  return candidate
}

export function createUniqueSkillPath(existingPaths: string[], parentPath: string): string {
  const folderBase = createUniquePath(
    existingPaths.map((path) => dirname(path)),
    parentPath,
    'skill'
  )
  let candidate = `${folderBase}/${ROOT_ROUTE_SKILL_PATH}`
  let counter = 2
  const used = new Set(existingPaths)

  while (used.has(candidate)) {
    candidate = `${folderBase}-${counter}/${ROOT_ROUTE_SKILL_PATH}`
    counter += 1
  }

  return candidate
}

export function isPathWithinFolder(path: string, folderPath: string): boolean {
  return path === folderPath || path.startsWith(`${folderPath}/`)
}

export function resolveRouteCodeAssetMethod(
  asset: RouteClientRecording | RouteSelectorResource
): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' {
  if (asset.method) {
    return asset.method
  }

  return asset.kind === 'resource' ? 'GET' : 'POST'
}

export function resolveRouteCodeAssetSource(
  asset: RouteClientRecording | RouteSelectorResource
): string {
  if (asset.kind === 'resource') {
    return (
      asset.scriptSource ??
      `return ${JSON.stringify(
        {
          selector: asset.selector,
          alternativeSelectors: asset.alternativeSelectors,
          tagName: asset.tagName,
          classes: asset.classes,
          text: asset.text,
          attributes: asset.attributes
        },
        null,
        2
      )}\n`
    )
  }

  if (asset.mode === 'script' && asset.scriptSource.trim()) {
    return asset.scriptSource
  }

  return `// Recorded flow (${asset.steps.length} step${asset.steps.length === 1 ? '' : 's'})\n// Edit this file to replace the legacy recording with code.\nreturn {\n  steps: ${asset.steps.length}\n}\n`
}

export function updateRouteCodeAssetSource(
  asset: RouteClientRecording | RouteSelectorResource,
  source: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
): RouteClientRecording | RouteSelectorResource {
  if (asset.kind === 'resource') {
    return {
      ...asset,
      method,
      scriptSource: source
    }
  }

  return {
    ...asset,
    method,
    mode: 'script',
    scriptSource: source
  }
}

export function getRouteRenameError(
  target: RouteRenameTarget | undefined,
  client: RouteClientConfig
): boolean {
  if (!target) {
    return false
  }

  if (target.kind === 'asset') {
    if (isRootRouteSkillPath(target.path)) {
      return true
    }

    const nextLeaf = normalizeMovedLeafName(target.value)

    if (!nextLeaf) {
      return true
    }

    return pathExistsInRouteExposes(
      client.exposes,
      replacePathLeaf(target.path, nextLeaf),
      target.assetId
    )
  }

  const nextLeaf = normalizeMovedLeafName(target.value)

  if (!nextLeaf) {
    return true
  }

  const nextFolderPath = replacePathLeaf(target.path, nextLeaf)
  const unaffected = client.exposes.filter(
    (asset) => !isPathWithinFolder(asset.path, target.path)
  )
  const renamedPaths = client.exposes
    .filter((asset) => isPathWithinFolder(asset.path, target.path))
    .map((asset) => replacePathPrefix(asset.path, target.path, nextFolderPath))
  const existing = new Set(unaffected.map((asset) => asset.path))

  if (renamedPaths.some((path) => existing.has(path))) {
    return true
  }

  return new Set(renamedPaths).size !== renamedPaths.length
}

export function replacePathLeaf(path: string, nextLeaf: string): string {
  const parentPath = dirname(path)
  return parentPath ? `${parentPath}/${nextLeaf}` : nextLeaf
}

export function replacePathPrefix(
  path: string,
  currentPrefix: string,
  nextPrefix: string
): string {
  if (path === currentPrefix) {
    return nextPrefix
  }

  return `${nextPrefix}/${path.slice(currentPrefix.length + 1)}`
}

export function createUniquePathForMove(
  existingPaths: string[],
  parentPath: string,
  leafName: string
): string {
  const safeLeafName = normalizeMovedLeafName(leafName)
  const basePath = parentPath ? `${parentPath}/${safeLeafName}` : safeLeafName
  let candidate = basePath
  let counter = 2
  const used = new Set(existingPaths)

  while (used.has(candidate)) {
    candidate = `${basePath}-${counter}`
    counter += 1
  }

  return candidate
}

export function normalizeMovedLeafName(value: string): string {
  if (/^skill\.md$/i.test(value)) {
    return 'SKILL.md'
  }

  if (value === '.ai') {
    return '.ai'
  }

  return slugifySegment(value) || 'asset'
}

export function dirname(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts.slice(0, -1).join('/')
}

export function basename(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts.at(-1) ?? ''
}

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
}

function pathExistsInRouteExposes(
  exposes: RouteExposeAsset[],
  nextPath: string,
  currentId?: string
): boolean {
  return exposes.some(
    (asset) => asset.id !== currentId && asset.path === nextPath
  )
}

import type { BackgroundClientConfig, BackgroundExposeAsset } from '#~/shared/config.js'

import type { BackgroundRenameTarget } from '../types.js'

export function getSharedBackgroundDisplayPrefix(
  exposes: BackgroundExposeAsset[]
): string | undefined {
  const firstSegments = new Set(
    exposes
      .map((asset) => splitBackgroundPath(asset.path)[0])
      .filter(Boolean)
  )

  if (firstSegments.size !== 1) {
    return undefined
  }

  return firstSegments.values().next().value
}

export function getBackgroundDisplayPath(
  path: string,
  sharedDisplayPrefix: string | undefined
): string {
  const normalized = normalizeBackgroundPath(path)

  if (!sharedDisplayPrefix) {
    return normalized
  }

  const prefix = `/${sharedDisplayPrefix}`

  if (normalized === prefix) {
    return '/'
  }

  if (normalized.startsWith(`${prefix}/`)) {
    return normalized.slice(prefix.length)
  }

  return normalized
}

export function restoreBackgroundTreePath(
  path: string,
  sharedDisplayPrefix: string | undefined
): string {
  const normalized = normalizeBackgroundPath(path)

  if (!sharedDisplayPrefix) {
    return normalized
  }

  if (normalized === '/') {
    return `/${sharedDisplayPrefix}`
  }

  return `/${sharedDisplayPrefix}${normalized}`
}

export function replaceBackgroundPathLeaf(path: string, nextLeaf: string): string {
  const segments = splitBackgroundPath(path)
  const nextSegments = [...segments.slice(0, -1), nextLeaf]
  return `/${nextSegments.join('/')}`
}

export function replaceTreeFolderLeaf(path: string, nextLeaf: string): string {
  const segments = splitBackgroundPath(path)
  return [...segments.slice(0, -1), nextLeaf].join('/')
}

export function normalizeBackgroundTreeLeaf(value: string): string {
  return splitBackgroundPath(value).at(-1) ?? ''
}

export function normalizeBackgroundPath(path: string): string {
  const segments = splitBackgroundPath(path)
  return segments.length > 0 ? `/${segments.join('/')}` : '/'
}

export function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '')
}

export function isBackgroundTreePathWithinFolder(
  path: string,
  folderPath: string
): boolean {
  const normalizedPath = stripLeadingSlash(normalizeBackgroundPath(path))
  const normalizedFolderPath = stripLeadingSlash(normalizeBackgroundPath(folderPath))

  return normalizedPath === normalizedFolderPath ||
    normalizedPath.startsWith(`${normalizedFolderPath}/`)
}

export function replaceBackgroundDisplayPathPrefix(
  path: string,
  currentPrefix: string,
  nextPrefix: string
): string {
  const normalizedPath = stripLeadingSlash(normalizeBackgroundPath(path))
  const normalizedCurrentPrefix = stripLeadingSlash(
    normalizeBackgroundPath(currentPrefix)
  )
  const normalizedNextPrefix = stripLeadingSlash(normalizeBackgroundPath(nextPrefix))

  if (normalizedPath === normalizedCurrentPrefix) {
    return normalizedNextPrefix
  }

  return `${normalizedNextPrefix}/${normalizedPath.slice(
    normalizedCurrentPrefix.length + 1
  )}`
}

export function createUniqueBackgroundDisplayPath(
  existingPaths: string[],
  parentPath: string,
  leafName: string
): string {
  const safeLeafName = normalizeBackgroundTreeLeaf(leafName)
  const normalizedParentPath = stripLeadingSlash(normalizeBackgroundPath(parentPath))
  const basePath = normalizedParentPath
    ? `${normalizedParentPath}/${safeLeafName}`
    : safeLeafName
  let candidate = basePath
  let counter = 2
  const used = new Set(existingPaths.map((path) => stripLeadingSlash(normalizeBackgroundPath(path))))

  while (used.has(candidate)) {
    candidate = `${basePath}-${counter}`
    counter += 1
  }

  return candidate
}

export function pathExistsInBackgroundExposes(
  exposes: BackgroundExposeAsset[],
  nextPath: string,
  currentId?: BackgroundExposeAsset['id']
): boolean {
  const normalized = normalizeBackgroundPath(nextPath)

  return exposes.some(
    (asset) =>
      asset.id !== currentId &&
      normalizeBackgroundPath(asset.path) === normalized
  )
}

export function splitBackgroundPath(path: string): string[] {
  return path
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
    )
    .filter(Boolean)
}

export function computeBackgroundFolderRenamePaths(
  client: BackgroundClientConfig,
  renameTarget: Extract<BackgroundRenameTarget, { kind: 'folder' }>,
  sharedDisplayPrefix: string | undefined
) {
  const nextLeaf = normalizeBackgroundTreeLeaf(renameTarget.value)
  const nextFolderPath = replaceTreeFolderLeaf(renameTarget.path, nextLeaf)
  const actualTargetFolderPath = stripLeadingSlash(
    restoreBackgroundTreePath(renameTarget.path, sharedDisplayPrefix)
  )
  const actualNextFolderPath = stripLeadingSlash(
    restoreBackgroundTreePath(nextFolderPath, sharedDisplayPrefix)
  )

  return {
    actualNextFolderPath,
    actualTargetFolderPath,
    affected: client.exposes.filter((asset) =>
      stripLeadingSlash(normalizeBackgroundPath(asset.path)).startsWith(
        `${actualTargetFolderPath}/`
      )
    ),
    nextFolderPath,
    nextLeaf
  }
}

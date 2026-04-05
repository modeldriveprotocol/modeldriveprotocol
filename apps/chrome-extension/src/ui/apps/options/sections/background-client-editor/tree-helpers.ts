import type { MouseEvent as ReactMouseEvent } from 'react'

import {
  deriveDisabledBackgroundExposePaths,
  getBackgroundExposeDefinition,
  type BackgroundClientConfig,
  type BackgroundExposeAsset
} from '#~/shared/config.js'
import {
  buildAssetFileTree,
  type AssetFileTreeNode
} from '../asset-tree-shared.js'
import type { BackgroundRenameTarget } from './types.js'

export function buildBackgroundTree(
  exposes: BackgroundExposeAsset[],
  sharedDisplayPrefix: string | undefined
): AssetFileTreeNode[] {
  return buildAssetFileTree(
    exposes.map((asset) => ({
      ...asset,
      path: getBackgroundDisplayPath(asset.path, sharedDisplayPrefix),
      name: getBackgroundDisplayPath(asset.path, sharedDisplayPrefix)
    })),
    (asset) => {
      const definition = getBackgroundExposeDefinition(asset.id)
      return [
        asset.path,
        asset.description,
        definition?.method,
        definition?.sourceKind,
        definition?.group
      ]
        .filter(Boolean)
        .join(' ')
    }
  )
}

export function getPreferredBackgroundAssetId(
  exposes: BackgroundExposeAsset[]
): BackgroundExposeAsset['id'] | undefined {
  return (
    exposes.find((asset) => asset.path.endsWith('/SKILL.md'))?.id ??
    exposes.find((asset) => asset.path.endsWith('SKILL.md'))?.id ??
    exposes[0]?.id
  )
}

export function resolveInitialBackgroundAssetId(
  exposes: BackgroundExposeAsset[],
  initialAssetPath: string | undefined
): BackgroundExposeAsset['id'] | undefined {
  if (initialAssetPath) {
    const matchedAsset = exposes.find((asset) => asset.path === initialAssetPath)

    if (matchedAsset) {
      return matchedAsset.id
    }
  }

  return getPreferredBackgroundAssetId(exposes)
}

export function handleBackgroundExpandedItemsChange(
  itemIds: string[],
  setExpandedFolders: (updater: (paths: string[]) => string[]) => void
) {
  const nextPaths = itemIds
    .filter((itemId) => itemId.startsWith('asset-folder:'))
    .map((itemId) => itemId.slice('asset-folder:'.length))
    .sort()

  setExpandedFolders((current) => {
    const currentSorted = [...current].sort()

    return currentSorted.length === nextPaths.length &&
      currentSorted.every((path, index) => path === nextPaths[index])
      ? current
      : nextPaths
  })
}

export function handleBackgroundExpandableItemClick(
  event: ReactMouseEvent<HTMLDivElement>,
  itemId: string,
  setSelectedItemId: (itemId: string) => void,
  setExpandedFolders: (updater: (paths: string[]) => string[]) => void
) {
  event.preventDefault()
  event.stopPropagation()

  setSelectedItemId(itemId)
  toggleBackgroundExpandedItem(itemId, setExpandedFolders)
}

export function getCollapsedBackgroundSelectionTarget(
  previousItemIds: string[],
  nextItemIds: string[],
  selectedItemId: string,
  selectedAssetPath: string | undefined,
  selectedFolderPath: string | undefined,
  sharedDisplayPrefix: string | undefined
): string | undefined {
  const collapsedItemIds = previousItemIds.filter(
    (itemId) => isExpandableBackgroundItem(itemId) && !nextItemIds.includes(itemId)
  )

  return collapsedItemIds.find((itemId) =>
    isBackgroundSelectionWithinItem(
      itemId,
      selectedItemId,
      selectedAssetPath,
      selectedFolderPath,
      sharedDisplayPrefix
    )
  )
}

export function getSelectedBackgroundAssetId(itemId: string) {
  if (itemId.startsWith('asset:')) {
    return itemId.slice('asset:'.length) as BackgroundExposeAsset['id']
  }

  return undefined
}

export function getSelectedBackgroundFolderPath(itemId: string) {
  if (itemId.startsWith('asset-folder:')) {
    return itemId.slice('asset-folder:'.length)
  }

  return undefined
}

export function commitBackgroundRename(
  client: BackgroundClientConfig,
  renameTarget: BackgroundRenameTarget | undefined,
  renameError: boolean,
  sharedDisplayPrefix: string | undefined,
  setRenameTarget: (target: BackgroundRenameTarget | undefined) => void,
  setSelectedItemId: (itemId: string) => void,
  updateClient: (next: BackgroundClientConfig) => void
) {
  if (!renameTarget || renameError) {
    return
  }

  if (renameTarget.kind === 'asset') {
    const nextLeaf = normalizeBackgroundTreeLeaf(renameTarget.value)

    if (!nextLeaf) {
      return
    }

    const nextPath = replaceBackgroundPathLeaf(renameTarget.path, nextLeaf)
    const exposes = client.exposes.map((asset) =>
      asset.id === renameTarget.assetId
        ? {
            ...asset,
            path: restoreBackgroundTreePath(nextPath, sharedDisplayPrefix)
          }
        : asset
    )

    updateClient({
      ...client,
      exposes,
      disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
    })
    setSelectedItemId(`asset:${renameTarget.assetId}`)
    setRenameTarget(undefined)
    return
  }

  const nextLeaf = normalizeBackgroundTreeLeaf(renameTarget.value)

  if (!nextLeaf) {
    return
  }

  const nextFolderPath = replaceTreeFolderLeaf(renameTarget.path, nextLeaf)
  const exposes = client.exposes.map((asset) => {
    const normalizedAssetPath = stripLeadingSlash(normalizeBackgroundPath(asset.path))

    if (!normalizedAssetPath.startsWith(`${renameTarget.path}/`)) {
      return asset
    }

    return {
      ...asset,
      path: `/${nextFolderPath}/${normalizedAssetPath.slice(renameTarget.path.length + 1)}`
    }
  })

  updateClient({
    ...client,
    exposes,
    disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
  })
  setSelectedItemId(`asset-folder:${nextFolderPath}`)
  setRenameTarget(undefined)
}

export function getBackgroundRenameError(
  target: BackgroundRenameTarget | undefined,
  client: BackgroundClientConfig,
  sharedDisplayPrefix?: string
): boolean {
  if (!target) {
    return false
  }

  if (target.kind === 'asset') {
    const nextLeaf = normalizeBackgroundTreeLeaf(target.value)

    if (!nextLeaf) {
      return true
    }

    return pathExistsInBackgroundExposes(
      client.exposes,
      restoreBackgroundTreePath(
        replaceBackgroundPathLeaf(target.path, nextLeaf),
        sharedDisplayPrefix
      ),
      target.assetId
    )
  }

  const nextLeaf = normalizeBackgroundTreeLeaf(target.value)

  if (!nextLeaf) {
    return true
  }

  const nextFolderPath = replaceTreeFolderLeaf(target.path, nextLeaf)
  const actualTargetFolderPath = stripLeadingSlash(
    restoreBackgroundTreePath(target.path, sharedDisplayPrefix)
  )
  const actualNextFolderPath = stripLeadingSlash(
    restoreBackgroundTreePath(nextFolderPath, sharedDisplayPrefix)
  )
  const affected = client.exposes.filter(
    (asset) =>
      stripLeadingSlash(normalizeBackgroundPath(asset.path)).startsWith(
        `${actualTargetFolderPath}/`
      )
  )
  const unaffected = client.exposes.filter((asset) => !affected.includes(asset))
  const nextPaths = affected.map((asset) =>
    `/${actualNextFolderPath}/${stripLeadingSlash(normalizeBackgroundPath(asset.path)).slice(actualTargetFolderPath.length + 1)}`
  )
  const existing = new Set(unaffected.map((asset) => normalizeBackgroundPath(asset.path)))

  if (nextPaths.some((path) => existing.has(normalizeBackgroundPath(path)))) {
    return true
  }

  return new Set(nextPaths.map((path) => normalizeBackgroundPath(path))).size !== nextPaths.length
}

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

function toggleBackgroundExpandedItem(
  itemId: string,
  setExpandedFolders: (updater: (paths: string[]) => string[]) => void
) {
  if (itemId.startsWith('asset-folder:')) {
    const path = itemId.slice('asset-folder:'.length)
    setExpandedFolders((current) =>
      current.includes(path)
        ? current.filter((value) => value !== path)
        : [...current, path]
    )
  }
}

function isExpandableBackgroundItem(itemId: string): boolean {
  return itemId.startsWith('asset-folder:')
}

function isBackgroundSelectionWithinItem(
  itemId: string,
  selectedItemId: string,
  selectedAssetPath: string | undefined,
  selectedFolderPath: string | undefined,
  sharedDisplayPrefix: string | undefined
): boolean {
  if (itemId === selectedItemId) {
    return true
  }

  const folderPath = getSelectedBackgroundFolderPath(itemId)

  if (!folderPath) {
    return false
  }

  if (selectedFolderPath) {
    return selectedFolderPath === folderPath || selectedFolderPath.startsWith(`${folderPath}/`)
  }

  if (!selectedAssetPath) {
    return false
  }

  const normalizedAssetPath = stripLeadingSlash(
    getBackgroundDisplayPath(selectedAssetPath, sharedDisplayPrefix)
  )
  return normalizedAssetPath.startsWith(`${folderPath}/`)
}

function pathExistsInBackgroundExposes(
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

function replaceBackgroundPathLeaf(path: string, nextLeaf: string): string {
  const segments = splitBackgroundPath(path)
  const nextSegments = [...segments.slice(0, -1), nextLeaf]
  return `/${nextSegments.join('/')}`
}

function replaceTreeFolderLeaf(path: string, nextLeaf: string): string {
  const segments = splitBackgroundPath(path)
  return [...segments.slice(0, -1), nextLeaf].join('/')
}

function normalizeBackgroundTreeLeaf(value: string): string {
  return splitBackgroundPath(value).at(-1) ?? ''
}

function normalizeBackgroundPath(path: string): string {
  const segments = splitBackgroundPath(path)
  return segments.length > 0 ? `/${segments.join('/')}` : '/'
}

function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '')
}

function splitBackgroundPath(path: string): string[] {
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

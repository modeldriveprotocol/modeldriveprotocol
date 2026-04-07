import {
  deriveDisabledBackgroundExposePaths,
  type BackgroundClientConfig
} from '#~/shared/config.js'

import type { BackgroundRenameTarget } from '../types.js'
import {
  computeBackgroundFolderRenamePaths,
  normalizeBackgroundPath,
  normalizeBackgroundTreeLeaf,
  pathExistsInBackgroundExposes,
  replaceBackgroundPathLeaf,
  restoreBackgroundTreePath,
  stripLeadingSlash
} from './path-utils.js'

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

  const folderRename = computeBackgroundFolderRenamePaths(
    client,
    renameTarget,
    sharedDisplayPrefix
  )

  if (!folderRename.nextLeaf) {
    return
  }

  const exposes = client.exposes.map((asset) => {
    const normalizedAssetPath = stripLeadingSlash(normalizeBackgroundPath(asset.path))

    if (
      !normalizedAssetPath.startsWith(`${folderRename.actualTargetFolderPath}/`)
    ) {
      return asset
    }

    return {
      ...asset,
      path: `/${folderRename.actualNextFolderPath}/${normalizedAssetPath.slice(
        folderRename.actualTargetFolderPath.length + 1
      )}`
    }
  })

  updateClient({
    ...client,
    exposes,
    disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
  })
  setSelectedItemId(`asset-folder:${folderRename.nextFolderPath}`)
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

  const folderRename = computeBackgroundFolderRenamePaths(
    client,
    target,
    sharedDisplayPrefix
  )

  if (!folderRename.nextLeaf) {
    return true
  }

  const unaffected = client.exposes.filter(
    (asset) => !folderRename.affected.includes(asset)
  )
  const nextPaths = folderRename.affected.map((asset) =>
    `/${folderRename.actualNextFolderPath}/${stripLeadingSlash(
      normalizeBackgroundPath(asset.path)
    ).slice(folderRename.actualTargetFolderPath.length + 1)}`
  )
  const existing = new Set(unaffected.map((asset) => normalizeBackgroundPath(asset.path)))

  if (nextPaths.some((path) => existing.has(normalizeBackgroundPath(path)))) {
    return true
  }

  return new Set(nextPaths.map((path) => normalizeBackgroundPath(path))).size !== nextPaths.length
}

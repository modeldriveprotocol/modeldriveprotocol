import type { MouseEvent as ReactMouseEvent } from 'react'

import type { BackgroundExposeAsset } from '#~/shared/config.js'

import {
  getBackgroundDisplayPath,
  stripLeadingSlash
} from './path-utils.js'

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

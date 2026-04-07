export type TreeSelectionModifiers = {
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

export function getCollapsedTreeSelectionTarget(options: {
  prefix: string
  previousExpandedItemIds: string[]
  nextExpandedItemIds: string[]
  selectedItemId: string
  selectedAssetPath: string | undefined
  selectedFolderPath: string | undefined
}) {
  const collapsedFolderItemIds = options.previousExpandedItemIds.filter(
    (itemId) =>
      itemId.startsWith(`${options.prefix}-folder:`) &&
      !options.nextExpandedItemIds.includes(itemId)
  )

  return collapsedFolderItemIds.find((itemId) => {
    const folderPath = getTreeFolderPath(options.prefix, itemId)

    if (!folderPath) {
      return false
    }

    if (options.selectedItemId === itemId) {
      return true
    }

    if (options.selectedFolderPath) {
      return (
        options.selectedFolderPath === folderPath ||
        options.selectedFolderPath.startsWith(`${folderPath}/`)
      )
    }

    if (!options.selectedAssetPath) {
      return false
    }

    return (
      options.selectedAssetPath === folderPath ||
      options.selectedAssetPath.startsWith(`${folderPath}/`)
    )
  })
}

export function resolveNextTreeSelection(options: {
  currentPrimaryItemId: string
  currentSelectedItemIds: string[]
  nextItemId: string
  orderedItemIds: string[]
  modifiers: TreeSelectionModifiers
}) {
  const orderedSet = new Set(options.orderedItemIds)
  const normalizedCurrentSelection = options.currentSelectedItemIds.filter((itemId) =>
    orderedSet.has(itemId)
  )

  if (
    options.modifiers.shiftKey &&
    orderedSet.has(options.currentPrimaryItemId) &&
    orderedSet.has(options.nextItemId)
  ) {
    const currentIndex = options.orderedItemIds.indexOf(options.currentPrimaryItemId)
    const nextIndex = options.orderedItemIds.indexOf(options.nextItemId)
    const [start, end] =
      currentIndex <= nextIndex
        ? [currentIndex, nextIndex]
        : [nextIndex, currentIndex]

    return {
      primaryItemId: options.nextItemId,
      selectedItemIds: options.orderedItemIds.slice(start, end + 1)
    }
  }

  if (options.modifiers.ctrlKey || options.modifiers.metaKey) {
    const selectedSet = new Set(normalizedCurrentSelection)

    if (selectedSet.has(options.nextItemId)) {
      selectedSet.delete(options.nextItemId)
    } else {
      selectedSet.add(options.nextItemId)
    }

    return {
      primaryItemId: options.nextItemId,
      selectedItemIds: options.orderedItemIds.filter((itemId) =>
        selectedSet.has(itemId)
      )
    }
  }

  return {
    primaryItemId: options.nextItemId,
    selectedItemIds: [options.nextItemId]
  }
}

export function normalizeTreeSelection(
  currentSelectedItemIds: string[],
  orderedItemIds: string[]
) {
  const orderedSet = new Set(orderedItemIds)
  return currentSelectedItemIds.filter((itemId) => orderedSet.has(itemId))
}

export function hasTreeMultiSelection(selectedItemIds: string[]) {
  return selectedItemIds.length > 1
}

function getTreeFolderPath(prefix: string, itemId: string) {
  if (itemId.startsWith(`${prefix}-folder:`)) {
    return itemId.slice(`${prefix}-folder:`.length)
  }

  return undefined
}

export type TreeSelectionModifiers = {
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
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

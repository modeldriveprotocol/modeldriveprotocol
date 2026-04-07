import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  SetStateAction
} from 'react'

import type {
  RouteClientConfig,
  RouteExposeAsset
} from '#~/shared/config.js'
import {
  collectAssetFolderPaths,
  resolveNextTreeSelection,
  type AssetFileTreeNode
} from '../asset-tree-shared.js'
import {
  moveRouteAssetToFolder,
  moveRouteFolderToFolder
} from './asset-mutations.js'
import type {
  DragState,
  RouteRenameTarget,
  TreeContextMenuTarget,
  TreeContextMenuState
} from './types.js'

export function useClientAssetsPanelTreeActions({
  client,
  commitExposes,
  routeTree,
  selectedItemId,
  selectedItemIds,
  setContextMenu,
  setDisplayedFileId,
  setDragState,
  setDropTargetItemId,
  setExpandedFolders,
  setRenameTarget,
  setSelectedItemIds,
  setSelectedItemId
}: {
  client: RouteClientConfig
  commitExposes: (nextExposes: RouteExposeAsset[]) => void
  routeTree: AssetFileTreeNode[]
  selectedItemId: string
  selectedItemIds: string[]
  setContextMenu: (state: TreeContextMenuState | undefined) => void
  setDisplayedFileId: (value: string | undefined) => void
  setDragState: (value: DragState | undefined) => void
  setDropTargetItemId: (value: string | undefined) => void
  setExpandedFolders: Dispatch<SetStateAction<string[]>>
  setRenameTarget: (
    value:
      | RouteRenameTarget
      | undefined
      | ((current: RouteRenameTarget | undefined) => RouteRenameTarget | undefined)
  ) => void
  setSelectedItemIds: (value: string[]) => void
  setSelectedItemId: (value: string) => void
}) {
  function openItem(
    itemId: string,
    orderedItemIds: string[],
    event: ReactMouseEvent
  ) {
    const nextSelection = resolveNextTreeSelection({
      currentPrimaryItemId: selectedItemId,
      currentSelectedItemIds: selectedItemIds,
      nextItemId: itemId,
      orderedItemIds,
      modifiers: {
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      }
    })

    setSelectedItemId(nextSelection.primaryItemId)
    setSelectedItemIds(nextSelection.selectedItemIds)

    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      return
    }

    if (itemId.startsWith('route-asset-folder:')) {
      const folderPath = itemId.slice('route-asset-folder:'.length)
      setExpandedFolders((current) =>
        current.includes(folderPath)
          ? current.filter((path) => path !== folderPath)
          : [...current, folderPath]
      )
      return
    }

    if (itemId.startsWith('route-asset:')) {
      setDisplayedFileId(itemId.slice('route-asset:'.length))
    }
  }

  function openContextMenu(
    event: ReactMouseEvent,
    target: TreeContextMenuTarget
  ) {
    event.preventDefault()
    event.stopPropagation()
    setRenameTarget(undefined)
    setContextMenu({
      kind: target.kind,
      assetId: target.assetId,
      folderPath: target.folderPath,
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6
    })
  }

  function startRename(target: RouteRenameTarget, itemId: string) {
    setRenameTarget(target)
    setSelectedItemId(itemId)

    if (target.kind === 'asset') {
      setDisplayedFileId(target.assetId)
    }
  }

  function expandAllFolders() {
    setExpandedFolders(collectAssetFolderPaths(routeTree))
  }

  function collapseAllFolders() {
    setExpandedFolders([])
  }

  function toggleFolder(folderPath: string) {
    setExpandedFolders((current) =>
      current.includes(folderPath)
        ? current.filter((path) => path !== folderPath)
        : [...current, folderPath]
    )
  }

  function handleDrop(
    folderPath: string,
    itemId: string,
    dragState: DragState | undefined
  ) {
    if (!dragState) {
      return
    }

    if (dragState.kind === 'asset') {
      const nextExposes = moveRouteAssetToFolder(client, dragState.assetId, folderPath)

      if (nextExposes) {
        commitExposes(nextExposes)
        setSelectedItemId(`route-asset:${dragState.assetId}`)
        setDisplayedFileId(dragState.assetId)
      }
    } else {
      const nextFolderMove = moveRouteFolderToFolder(
        client,
        dragState.path,
        folderPath
      )

      if (nextFolderMove) {
        commitExposes(nextFolderMove.nextExposes)
        setSelectedItemId(`route-asset-folder:${nextFolderMove.nextFolderPath}`)
        setExpandedFolders((current) =>
          current
            .filter((path) => path !== dragState.path && !path.startsWith(`${dragState.path}/`))
            .concat(nextFolderMove.nextFolderPath)
        )
      }
    }

    setDropTargetItemId(undefined)
    setDragState(undefined)
  }

  return {
    collapseAllFolders,
    expandAllFolders,
    handleDrop,
    openContextMenu,
    openItem,
    startRename,
    toggleFolder
  }
}

import type {
  MouseEvent as ReactMouseEvent
} from 'react'

import {
  deriveDisabledBackgroundExposePaths,
  type BackgroundClientConfig,
  type BackgroundExposeAsset,
  type ExtensionConfig
} from '#~/shared/config.js'
import {
  applyEnabledValue,
  collectFolderAssetIds,
  resolveNextTreeSelection,
  toggleEnabledAsset,
  toggleEnabledFolder
} from '../asset-tree-shared.js'
import {
  commitBackgroundRename,
  createUniqueBackgroundDisplayPath,
  getBackgroundDisplayPath,
  isBackgroundTreePathWithinFolder,
  replaceBackgroundDisplayPathPrefix,
  restoreBackgroundTreePath,
  stripLeadingSlash
} from './tree-helpers.js'
import type {
  BackgroundContextMenuState,
  BackgroundContextMenuTarget,
  BackgroundDragState,
  BackgroundRenameTarget
} from './types.js'

export function useBackgroundClientEditorActions({
  assetEnabled,
  client,
  draft,
  onChange,
  renameError,
  renameTarget,
  selectedItemId,
  selectedItemIds,
  setContextMenu,
  setDisplayedAssetId,
  setDragState,
  setDropTargetItemId,
  setExpandedFolders,
  setRenameTarget,
  setSelectedItemIds,
  setSelectedItemId,
  sharedDisplayPrefix
}: {
  assetEnabled: Map<BackgroundExposeAsset['id'], boolean>
  client: BackgroundClientConfig
  draft: ExtensionConfig
  onChange: (config: ExtensionConfig) => void
  renameError: boolean
  renameTarget: BackgroundRenameTarget | undefined
  selectedItemId: string
  selectedItemIds: string[]
  setContextMenu: (state: BackgroundContextMenuState | undefined) => void
  setDisplayedAssetId: (
    assetId: BackgroundExposeAsset['id'] | undefined
  ) => void
  setDragState: (state: BackgroundDragState | undefined) => void
  setDropTargetItemId: (itemId: string | undefined) => void
  setExpandedFolders: (updater: (paths: string[]) => string[]) => void
  setRenameTarget: (
    target:
      | BackgroundRenameTarget
      | undefined
      | ((current: BackgroundRenameTarget | undefined) => BackgroundRenameTarget | undefined)
  ) => void
  setSelectedItemIds: (itemIds: string[]) => void
  setSelectedItemId: (itemId: string) => void
  sharedDisplayPrefix: string | undefined
}) {
  const displayPathEntries = client.exposes.map((asset) => ({
    assetId: asset.id,
    path: stripLeadingSlash(
      getBackgroundDisplayPath(asset.path, sharedDisplayPrefix)
    )
  }))

  function updateClient(next: BackgroundClientConfig) {
    onChange({
      ...draft,
      backgroundClients: draft.backgroundClients.map((item) =>
        item.id === next.id ? next : item
      )
    })
  }

  function updateExpose(
    id: BackgroundExposeAsset['id'],
    updater: (asset: BackgroundExposeAsset) => BackgroundExposeAsset
  ) {
    const exposes = client.exposes.map((asset) =>
      asset.id === id ? updater(asset) : asset
    )

    updateClient({
      ...client,
      exposes,
      disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
    })
  }

  function commitBackgroundExposes(exposes: BackgroundExposeAsset[]) {
    updateClient({
      ...client,
      exposes,
      disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
    })
  }

  function toggleBackgroundAssetEnabled(assetId: BackgroundExposeAsset['id']) {
    const nextExposes = toggleEnabledAsset(client.exposes, assetId, assetEnabled)

    if (nextExposes) {
      commitBackgroundExposes(nextExposes)
    }
  }

  function toggleBackgroundFolderEnabled(folderPath: string) {
    const nextExposes = toggleEnabledFolder(
      client.exposes,
      displayPathEntries,
      folderPath,
      assetEnabled
    )

    if (nextExposes) {
      commitBackgroundExposes(nextExposes)
    }
  }

  function openContextMenu(
    event: ReactMouseEvent,
    target: BackgroundContextMenuTarget
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

  function setBackgroundSelectionEnabled(itemIds: string[], enabled: boolean) {
    const assetIds = new Set<BackgroundExposeAsset['id']>()

    for (const itemId of itemIds) {
      if (itemId.startsWith('asset:')) {
        assetIds.add(itemId.slice('asset:'.length) as BackgroundExposeAsset['id'])
        continue
      }

      if (itemId.startsWith('asset-folder:')) {
        for (const assetId of collectFolderAssetIds(
          displayPathEntries,
          itemId.slice('asset-folder:'.length)
        ) as BackgroundExposeAsset['id'][]) {
          assetIds.add(assetId)
        }
      }
    }

    if (assetIds.size === 0) {
      return
    }

    commitBackgroundExposes(
      applyEnabledValue(client.exposes, [...assetIds], enabled)
    )
  }

  function selectItem(
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

    if (itemId.startsWith('asset-folder:')) {
      const folderPath = itemId.slice('asset-folder:'.length)
      setExpandedFolders((current) =>
        current.includes(folderPath)
          ? current.filter((path) => path !== folderPath)
          : [...current, folderPath]
      )
      return
    }

    if (itemId.startsWith('asset:')) {
      setDisplayedAssetId(itemId.slice('asset:'.length) as BackgroundExposeAsset['id'])
    }
  }

  function startRename(target: BackgroundRenameTarget, itemId: string) {
    setRenameTarget(target)
    setSelectedItemId(itemId)
    setSelectedItemIds([itemId])

    if (target.kind === 'asset') {
      setDisplayedAssetId(target.assetId)
    }
  }

  function commitRename() {
    commitBackgroundRename(
      client,
      renameTarget,
      renameError,
      sharedDisplayPrefix,
      setRenameTarget,
      setSelectedItemId,
      updateClient
    )
  }

  function handleDrop(
    folderPath: string,
    dragState: BackgroundDragState | undefined
  ) {
    if (!dragState) {
      return
    }

    if (dragState.kind === 'asset') {
      const currentDisplayPath = displayPathEntries.find(
        (entry) => entry.assetId === dragState.assetId
      )?.path

      if (!currentDisplayPath) {
        setDropTargetItemId(undefined)
        setDragState(undefined)
        return
      }

      const nextDisplayPath = createUniqueBackgroundDisplayPath(
        displayPathEntries
          .filter((entry) => entry.assetId !== dragState.assetId)
          .map((entry) => entry.path),
        folderPath,
        currentDisplayPath.split('/').at(-1) ?? currentDisplayPath
      )

      if (nextDisplayPath !== currentDisplayPath) {
        commitBackgroundExposes(
          client.exposes.map((asset) =>
            asset.id === dragState.assetId
              ? {
                  ...asset,
                  path: restoreBackgroundTreePath(
                    nextDisplayPath,
                    sharedDisplayPrefix
                  )
                }
              : asset
          )
        )
      }

      setSelectedItemId(`asset:${dragState.assetId}`)
      setSelectedItemIds([`asset:${dragState.assetId}`])
      setDisplayedAssetId(dragState.assetId)
      setDropTargetItemId(undefined)
      setDragState(undefined)
      return
    }

    if (
      dragState.path === folderPath ||
      (folderPath && folderPath.startsWith(`${dragState.path}/`))
    ) {
      setDropTargetItemId(undefined)
      setDragState(undefined)
      return
    }

    const nextFolderPath = createUniqueBackgroundDisplayPath(
      displayPathEntries
        .filter((entry) => !isBackgroundTreePathWithinFolder(entry.path, dragState.path))
        .map((entry) => entry.path),
      folderPath,
      dragState.path.split('/').at(-1) ?? dragState.path
    )

    if (nextFolderPath !== dragState.path) {
      commitBackgroundExposes(
        client.exposes.map((asset) => {
          const currentDisplayPath = stripLeadingSlash(
            getBackgroundDisplayPath(asset.path, sharedDisplayPrefix)
          )

          if (!isBackgroundTreePathWithinFolder(currentDisplayPath, dragState.path)) {
            return asset
          }

          return {
            ...asset,
            path: restoreBackgroundTreePath(
              replaceBackgroundDisplayPathPrefix(
                currentDisplayPath,
                dragState.path,
                nextFolderPath
              ),
              sharedDisplayPrefix
            )
          }
        })
      )
    }

    setSelectedItemId(`asset-folder:${nextFolderPath}`)
    setSelectedItemIds([`asset-folder:${nextFolderPath}`])
    setExpandedFolders((current) =>
      current
        .filter((path) => !isBackgroundTreePathWithinFolder(path, dragState.path))
        .concat(nextFolderPath)
    )
    setDropTargetItemId(undefined)
    setDragState(undefined)
  }

  function toggleFolder(folderPath: string) {
    setExpandedFolders((current) =>
      current.includes(folderPath)
        ? current.filter((path) => path !== folderPath)
        : [...current, folderPath]
    )
  }

  return {
    commitRename,
    handleDrop,
    openContextMenu,
    setBackgroundSelectionEnabled,
    selectItem,
    startRename,
    toggleFolder,
    toggleBackgroundAssetEnabled,
    toggleBackgroundFolderEnabled,
    updateClient,
    updateExpose
  }
}

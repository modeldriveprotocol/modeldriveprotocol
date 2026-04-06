import type { Dispatch, SetStateAction } from 'react'

import type {
  ExtensionConfig,
  RouteClientConfig,
  RouteClientRecording,
  RouteExposeAsset,
  RouteSelectorResource,
  RouteSkillEntry,
  RouteSkillFolder
} from '#~/shared/config.js'
import {
  createRouteClientConfig,
  isRootRouteSkillPath
} from '#~/shared/config.js'
import {
  applyEnabledValue,
  collectFolderAssetIds,
  type AssetFileTreeNode,
  toggleEnabledAsset,
  toggleEnabledFolder
} from '../asset-tree-shared.js'
import {
  basename,
  isPathWithinFolder,
  normalizeMovedLeafName,
  replacePathLeaf,
  replacePathPrefix
} from './asset-helpers.js'
import {
  createRouteCodeAsset,
  createRouteFolderAsset,
  createRouteMarkdownAsset
} from './asset-mutations.js'
import { useClientAssetsPanelTreeActions } from './use-client-assets-panel-tree-actions.js'
import type {
  ClientTreeItem,
  DragState,
  RouteRenameTarget,
  TreeContextMenuTarget,
  TreeMutationTarget,
  TreeContextMenuState
} from './types.js'

export function useClientAssetsPanelActions({
  assetEnabled,
  client,
  draft,
  fileItems,
  folderAssets,
  onChange,
  renameError,
  renameTarget,
  rootSkillId,
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
  setSelectedItemId,
  t
}: {
  assetEnabled: Map<string, boolean>
  client: RouteClientConfig
  draft: ExtensionConfig
  fileItems: ClientTreeItem[]
  folderAssets: RouteSkillFolder[]
  onChange: (config: ExtensionConfig) => void
  renameError: boolean
  renameTarget: RouteRenameTarget | undefined
  rootSkillId: string | undefined
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
  t: (key: string) => string
}) {
  function updateClient(next: RouteClientConfig) {
    onChange({
      ...draft,
      routeClients: draft.routeClients.map((item) =>
        item.id === next.id ? next : item
      )
    })
  }

  function commitExposes(nextExposes: RouteExposeAsset[]) {
    updateClient(
      createRouteClientConfig({
        ...client,
        exposes: nextExposes
      })
    )
  }

  function replaceExposeKind(
    kind: RouteExposeAsset['kind'],
    nextAssets: RouteExposeAsset[]
  ) {
    const remaining = client.exposes.filter((asset) => asset.kind !== kind)
    commitExposes([...nextAssets, ...remaining])
  }

  function addCode(parentPath: string) {
    const nextAsset = createRouteCodeAsset(
      client.exposes.map((asset) => asset.path),
      parentPath
    )

    commitExposes([nextAsset, ...client.exposes])
    setSelectedItemId(`route-asset:${nextAsset.id}`)
    setDisplayedFileId(nextAsset.id)
  }

  function addMarkdown(parentPath: string) {
    const nextAsset = createRouteMarkdownAsset(
      client.exposes.map((asset) => asset.path),
      parentPath,
      t('options.assets.skills.newTitle')
    )

    commitExposes([nextAsset, ...client.exposes])
    setSelectedItemId(`route-asset:${nextAsset.id}`)
    setDisplayedFileId(nextAsset.id)
  }

  function addFolder(parentPath: string) {
    const nextAsset = createRouteFolderAsset(
      folderAssets.map((asset) => asset.path),
      parentPath
    )

    commitExposes([nextAsset, ...client.exposes])
    setSelectedItemId(`route-asset-folder:${nextAsset.path}`)
    setExpandedFolders((current) => [...new Set([...current, nextAsset.path])])
  }

  function deleteTarget(
    target: TreeMutationTarget
  ) {
    if (target.assetId) {
      const asset = client.exposes.find((item) => item.id === target.assetId)

      if (!asset || (asset.kind === 'skill' && isRootRouteSkillPath(asset.path))) {
        return
      }

      commitExposes(client.exposes.filter((item) => item.id !== target.assetId))
      setSelectedItemId('root')
      setDisplayedFileId(rootSkillId)
      return
    }

    if (target.folderPath) {
      commitExposes(
        client.exposes.filter((asset) => !isPathWithinFolder(asset.path, target.folderPath ?? ''))
      )
      setSelectedItemId('root')
      setDisplayedFileId(rootSkillId)
    }
  }

  function deleteSelection(itemIds: string[]) {
    if (itemIds.length === 0) {
      return
    }

    const selectedFolderPaths = itemIds
      .filter((itemId) => itemId.startsWith('route-asset-folder:'))
      .map((itemId) => itemId.slice('route-asset-folder:'.length))
    const selectedAssetIds = new Set(
      itemIds
        .filter((itemId) => itemId.startsWith('route-asset:'))
        .map((itemId) => itemId.slice('route-asset:'.length))
    )
    const nextExposes = client.exposes.filter((asset) => {
      if (asset.kind === 'skill' && isRootRouteSkillPath(asset.path)) {
        return true
      }

      if (selectedAssetIds.has(asset.id)) {
        return false
      }

      return !selectedFolderPaths.some((folderPath) =>
        isPathWithinFolder(asset.path, folderPath)
      )
    })

    if (nextExposes.length === client.exposes.length) {
      return
    }

    commitExposes(nextExposes)
    setSelectedItemId('root')
    setSelectedItemIds([])
    setDisplayedFileId(rootSkillId)
  }

  function startRename(target: RouteRenameTarget, itemId: string) {
    if (target.kind === 'asset' && isRootRouteSkillPath(target.path)) {
      return
    }

    setRenameTarget(target)
    setSelectedItemId(itemId)
    if (target.kind === 'asset') {
      setDisplayedFileId(target.assetId)
    }
  }

  function commitRename() {
    if (!renameTarget || renameError) {
      return
    }

    if (renameTarget.kind === 'asset') {
      const nextLeaf = normalizeMovedLeafName(renameTarget.value)
      if (!nextLeaf) return
      const nextPath = replacePathLeaf(renameTarget.path, nextLeaf)
      commitExposes(
        client.exposes.map((asset) =>
          asset.id === renameTarget.assetId ? { ...asset, path: nextPath } : asset
        )
      )
      setSelectedItemId(`route-asset:${renameTarget.assetId}`)
      setDisplayedFileId(renameTarget.assetId)
      setRenameTarget(undefined)
      return
    }

    const nextLeaf = normalizeMovedLeafName(renameTarget.value)
    if (!nextLeaf) return
    const nextFolderPath = replacePathLeaf(renameTarget.path, nextLeaf)
    commitExposes(
      client.exposes.map((asset) =>
        isPathWithinFolder(asset.path, renameTarget.path)
          ? { ...asset, path: replacePathPrefix(asset.path, renameTarget.path, nextFolderPath) }
          : asset
      )
    )
    setSelectedItemId(`route-asset-folder:${nextFolderPath}`)
    setExpandedFolders((current) =>
      current
        .filter((path) => path !== renameTarget.path && !path.startsWith(`${renameTarget.path}/`))
        .concat(nextFolderPath)
    )
    setRenameTarget(undefined)
  }

  function toggleAssetEnabled(assetId: string) {
    const nextExposes = toggleEnabledAsset(client.exposes, assetId, assetEnabled)

    if (nextExposes) {
      commitExposes(nextExposes)
    }
  }

  function toggleFolderAssetEnabled(folderPath: string) {
    const nextExposes = toggleEnabledFolder(
      client.exposes,
      fileItems.map((item) => ({
        assetId: item.assetId,
        path: item.path
      })),
      folderPath,
      assetEnabled
    )

    if (nextExposes) {
      commitExposes(nextExposes)
    }
  }

  function setSelectionEnabled(itemIds: string[], enabled: boolean) {
    const selectedAssetIds = new Set<string>()

    for (const itemId of itemIds) {
      if (itemId.startsWith('route-asset:')) {
        selectedAssetIds.add(itemId.slice('route-asset:'.length))
        continue
      }

      if (itemId.startsWith('route-asset-folder:')) {
        for (const assetId of collectFolderAssetIds(
          fileItems.map((item) => ({
            assetId: item.assetId,
            path: item.path
          })),
          itemId.slice('route-asset-folder:'.length)
        )) {
          selectedAssetIds.add(assetId)
        }
      }
    }

    if (selectedAssetIds.size === 0) {
      return
    }

    commitExposes(
      applyEnabledValue(client.exposes, [...selectedAssetIds], enabled)
    )
  }

  const treeActions = useClientAssetsPanelTreeActions({
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
  })

  return {
    addCode,
    addFolder,
    addMarkdown,
    commitRename,
    deleteSelection,
    deleteTarget,
    replaceExposeKind,
    setSelectionEnabled,
    toggleAssetEnabled,
    toggleFolderAssetEnabled,
    ...treeActions,
    startRename
  }
}

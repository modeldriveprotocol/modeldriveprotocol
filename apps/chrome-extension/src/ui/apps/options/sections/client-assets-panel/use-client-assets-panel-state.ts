import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  RouteClientConfig
} from '#~/shared/config.js'
import { getRootRouteSkillId } from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../../../platform/extension-api.js'
import {
  buildAssetFileTree,
  collectAssetFolderPaths,
  collectVisibleAssetItemIds,
  filterAssetFileTree,
  listAncestorFolders,
  normalizeTreeSelection,
  mergeExpandedFolderPaths
} from '../asset-tree-shared.js'
import {
  basename,
  getRouteRenameError,
  resolveInitialAssetId
} from './asset-helpers.js'
import type {
  ClientTreeItem,
  DragState,
  RouteRenameTarget,
  TreeContextMenuState
} from './types.js'

export function useClientAssetsPanelState({
  client,
  initialPath,
  initialTab,
  onSelectedPathChange
}: {
  client: RouteClientConfig
  initialPath: string | undefined
  initialTab: OptionsAssetsTab | undefined
  onSelectedPathChange: (path: string | undefined) => void
}) {
  const [selectedItemId, setSelectedItemId] = useState('root')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [displayedFileId, setDisplayedFileId] = useState<string>()
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<TreeContextMenuState>()
  const [renameTarget, setRenameTarget] = useState<RouteRenameTarget>()
  const [dragState, setDragState] = useState<DragState>()
  const [dropTargetItemId, setDropTargetItemId] = useState<string>()
  const onSelectedPathChangeRef = useRef(onSelectedPathChange)

  onSelectedPathChangeRef.current = onSelectedPathChange

  const recordings = client.recordings
  const selectorResources = client.selectorResources
  const skillEntries = client.skillEntries
  const folderAssets = client.skillFolders
  const rootSkillId = useMemo(
    () => getRootRouteSkillId(skillEntries) ?? skillEntries[0]?.id,
    [skillEntries]
  )
  const fileItems = useMemo<ClientTreeItem[]>(
    () => [
      ...skillEntries.map((asset) => ({
        id: asset.id,
        kind: 'skill' as const,
        path: asset.path,
        name: basename(asset.path),
        enabled: asset.enabled,
        searchText: `${asset.metadata.title} ${asset.metadata.summary} ${asset.content}`,
        assetId: asset.id,
        method: undefined
      })),
      ...recordings.map((asset) => ({
        id: asset.id,
        kind: 'flow' as const,
        path: asset.path,
        name: asset.name,
        enabled: asset.enabled,
        searchText: `${asset.name} ${asset.description} ${asset.mode}`,
        assetId: asset.id,
        method: asset.method ?? 'POST'
      })),
      ...selectorResources.map((asset) => ({
        id: asset.id,
        kind: 'resource' as const,
        path: asset.path,
        name: asset.name,
        enabled: asset.enabled,
        searchText: `${asset.name} ${asset.description} ${asset.selector} ${asset.text ?? ''}`,
        assetId: asset.id,
        method: asset.method ?? 'GET'
      }))
    ],
    [recordings, selectorResources, skillEntries]
  )
  const assetsById = useMemo(
    () => new Map(fileItems.map((item) => [item.assetId, item])),
    [fileItems]
  )
  const assetKinds = useMemo(
    () => new Map(fileItems.map((item) => [item.assetId, item.kind])),
    [fileItems]
  )
  const assetMethods = useMemo(
    () => new Map(fileItems.map((item) => [item.assetId, item.method])),
    [fileItems]
  )
  const assetEnabled = useMemo(
    () => new Map(fileItems.map((item) => [item.assetId, item.enabled])),
    [fileItems]
  )
  const routeTree = useMemo(
    () =>
      buildAssetFileTree(
        fileItems,
        (item) => item.searchText,
        folderAssets.map((folder) => folder.path)
      ),
    [fileItems, folderAssets]
  )
  const filteredTree = useMemo(
    () => filterAssetFileTree(routeTree, searchQuery),
    [routeTree, searchQuery]
  )
  const forcedExpandedFolders = useMemo(
    () => (searchQuery.trim() ? collectAssetFolderPaths(filteredTree) : []),
    [filteredTree, searchQuery]
  )
  const visibleExpandedFolders = useMemo(
    () => [...new Set([...expandedFolders, ...forcedExpandedFolders])],
    [expandedFolders, forcedExpandedFolders]
  )
  const orderedVisibleItemIds = useMemo(
    () =>
      collectVisibleAssetItemIds(
        'route-asset',
        filteredTree,
        visibleExpandedFolders
      ),
    [filteredTree, visibleExpandedFolders]
  )
  const displayedAsset = displayedFileId
    ? assetsById.get(displayedFileId)
    : undefined
  const displayedFlow = displayedAsset?.kind === 'flow'
    ? recordings.find((asset) => asset.id === displayedAsset.assetId)
    : undefined
  const displayedSkill = displayedAsset?.kind === 'skill'
    ? skillEntries.find((asset) => asset.id === displayedAsset.assetId)
    : undefined
  const displayedResource = displayedAsset?.kind === 'resource'
    ? selectorResources.find((asset) => asset.id === displayedAsset.assetId)
    : undefined
  const selectedFolderPath = selectedItemId.startsWith('route-asset-folder:')
    ? selectedItemId.slice('route-asset-folder:'.length)
    : undefined
  const renameError = useMemo(
    () => getRouteRenameError(renameTarget, client),
    [client, renameTarget]
  )
  const expandedItems = visibleExpandedFolders.map(
    (path) => `route-asset-folder:${path}`
  )

  useEffect(() => {
    const preferredId = resolveInitialAssetId(
      client,
      initialPath,
      initialTab,
      rootSkillId
    )

    if (!preferredId) {
      setSelectedItemId('root')
      setSelectedItemIds([])
      setDisplayedFileId(undefined)
      return
    }

    const nextSelectedItemId = `route-asset:${preferredId}`
    setSelectedItemId(nextSelectedItemId)
    setSelectedItemIds([nextSelectedItemId])
    setDisplayedFileId(preferredId)
  }, [client.id, client.exposes, initialPath, initialTab, rootSkillId])

  useEffect(() => {
    if (!displayedFileId || assetsById.has(displayedFileId)) {
      return
    }

    setDisplayedFileId(rootSkillId)
  }, [assetsById, displayedFileId, rootSkillId])

  useEffect(() => {
    if (displayedAsset?.path) {
      setExpandedFolders((current) =>
        mergeExpandedFolderPaths(current, listAncestorFolders(displayedAsset.path))
      )
    }
  }, [displayedAsset?.path])

  useEffect(() => {
    setSelectedItemIds((current) =>
      normalizeTreeSelection(current, orderedVisibleItemIds)
    )
  }, [orderedVisibleItemIds])

  useEffect(() => {
    onSelectedPathChangeRef.current(displayedAsset?.path)
  }, [displayedAsset?.path])

  useEffect(() => {
    if (selectedFolderPath) {
      setExpandedFolders((current) =>
        mergeExpandedFolderPaths(current, listAncestorFolders(selectedFolderPath))
      )
    }
  }, [selectedFolderPath])

  return {
    assetEnabled,
    assetKinds,
    assetMethods,
    assetsById,
    contextMenu,
    displayedAsset,
    displayedFileId,
    displayedFlow,
    displayedResource,
    displayedSkill,
    dragState,
    dropTargetItemId,
    expandedFolders,
    expandedItems,
    fileItems,
    filteredTree,
    folderAssets,
    recordings,
    renameError,
    renameTarget,
    rootSkillId,
    routeTree,
    orderedVisibleItemIds,
    searchQuery,
    selectedFolderPath,
    selectedItemId,
    selectedItemIds,
    selectorResources,
    skillEntries,
    setContextMenu,
    setDisplayedFileId,
    setDragState,
    setDropTargetItemId,
    setExpandedFolders,
    setRenameTarget,
    setSearchQuery,
    setSelectedItemId,
    setSelectedItemIds
  }
}

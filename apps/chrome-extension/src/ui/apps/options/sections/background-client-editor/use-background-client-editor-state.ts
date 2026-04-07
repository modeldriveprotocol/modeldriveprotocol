import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

import {
  countEnabledBackgroundExposes,
  isRequiredBackgroundClientId,
  type BackgroundClientConfig,
  type BackgroundExposeAsset
} from '#~/shared/config.js'
import {
  collectAssetFolderPaths,
  collectVisibleAssetItemIds,
  filterAssetFileTree,
  findFirstAssetTreeItemId,
  normalizeTreeSelection,
  listAncestorFolders,
  mergeExpandedFolderPaths
} from '../asset-tree-shared.js'
import {
  buildBackgroundTree,
  getBackgroundDisplayPath,
  getPreferredBackgroundAssetId,
  getSelectedBackgroundAssetId,
  getSelectedBackgroundFolderPath,
  getSharedBackgroundDisplayPrefix,
  resolveInitialBackgroundAssetId
} from './tree-helpers.js'
import type {
  BackgroundContextMenuState,
  BackgroundDragState,
  BackgroundRenameTarget
} from './types.js'

export function useBackgroundClientEditorState({
  client,
  initialAssetPath,
  initialTab,
  onAssetPathChange,
  onTabChange
}: {
  client: BackgroundClientConfig
  initialAssetPath: string | undefined
  initialTab: 'basics' | 'assets' | 'activity' | undefined
  onAssetPathChange: (
    path: string | undefined,
    tab: 'basics' | 'assets' | 'activity'
  ) => void
  onTabChange: (tab: 'basics' | 'assets' | 'activity') => void
}) {
  const initialSelectedAssetId = resolveInitialBackgroundAssetId(
    client.exposes,
    initialAssetPath
  )
  const [tab, setTab] = useState<'basics' | 'assets' | 'activity'>(
    initialTab ?? 'basics'
  )
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialSelectedAssetId ? `asset:${initialSelectedAssetId}` : 'root'
  )
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    initialSelectedAssetId ? [`asset:${initialSelectedAssetId}`] : []
  )
  const [displayedAssetId, setDisplayedAssetId] = useState<
    BackgroundExposeAsset['id'] | undefined
  >(initialSelectedAssetId)
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [renameTarget, setRenameTarget] = useState<BackgroundRenameTarget>()
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<
    BackgroundContextMenuState | undefined
  >()
  const [dragState, setDragState] = useState<BackgroundDragState>()
  const [dropTargetItemId, setDropTargetItemId] = useState<string>()
  const onAssetPathChangeRef = useRef(onAssetPathChange)
  const onTabChangeRef = useRef(onTabChange)
  const lastAppliedRouteSelectionKeyRef = useRef<string | undefined>(undefined)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  onAssetPathChangeRef.current = onAssetPathChange
  onTabChangeRef.current = onTabChange

  useEffect(() => {
    setTab(initialTab ?? 'basics')
  }, [client.id, initialTab])

  useEffect(() => {
    onTabChangeRef.current(tab)
  }, [tab])

  const allExposes = client.exposes
  const enabledAssetCount = countEnabledBackgroundExposes(client)
  const totalAssetCount = client.exposes.length
  const isRequiredClient = isRequiredBackgroundClientId(client.id)
  const assetEnabled = useMemo(
    () => new Map(client.exposes.map((asset) => [asset.id, asset.enabled])),
    [client.exposes]
  )
  const exposesById = useMemo(
    () => new Map(client.exposes.map((asset) => [asset.id, asset])),
    [client.exposes]
  )
  const sharedDisplayPrefix = useMemo(
    () => getSharedBackgroundDisplayPrefix(allExposes),
    [allExposes]
  )
  const backgroundTree = useMemo(
    () => buildBackgroundTree(allExposes, sharedDisplayPrefix),
    [allExposes, sharedDisplayPrefix]
  )
  const filteredBackgroundTree = useMemo(
    () => filterAssetFileTree(backgroundTree, searchQuery),
    [backgroundTree, searchQuery]
  )
  const forcedExpandedFolders = useMemo(
    () =>
      searchQuery.trim() ? collectAssetFolderPaths(filteredBackgroundTree) : [],
    [filteredBackgroundTree, searchQuery]
  )
  const visibleExpandedFolders = useMemo(
    () => [...new Set([...expandedFolders, ...forcedExpandedFolders])],
    [expandedFolders, forcedExpandedFolders]
  )
  const visibleItemIds = useMemo(
    () =>
      new Set([
        'root',
        ...collectVisibleAssetItemIds(
          'asset',
          filteredBackgroundTree,
          visibleExpandedFolders
        )
      ]),
    [filteredBackgroundTree, visibleExpandedFolders]
  )
  const orderedVisibleItemIds = useMemo(
    () =>
      collectVisibleAssetItemIds(
        'asset',
        filteredBackgroundTree,
        visibleExpandedFolders
      ),
    [filteredBackgroundTree, visibleExpandedFolders]
  )
  const hasSearchResults = visibleItemIds.size > 1
  const searchTerm = searchQuery.trim()
  const selectedTreeItemId =
    selectedItemId !== 'root' && visibleItemIds.has(selectedItemId)
      ? selectedItemId
      : null
  const firstSearchResultItemId = useMemo(
    () =>
      searchTerm
        ? findFirstAssetTreeItemId('asset', filteredBackgroundTree)
        : undefined,
    [filteredBackgroundTree, searchTerm]
  )
  const selectedAssetId =
    displayedAssetId ?? getPreferredBackgroundAssetId(allExposes)
  const selectedAsset = selectedAssetId
    ? exposesById.get(selectedAssetId)
    : undefined
  const selectedFolderPath = getSelectedBackgroundFolderPath(selectedItemId)

  useEffect(() => {
    if (!selectedAsset?.path) {
      return
    }

    const displayPath = getBackgroundDisplayPath(
      selectedAsset.path,
      sharedDisplayPrefix
    )
    setExpandedFolders((current) =>
      mergeExpandedFolderPaths(current, listAncestorFolders(displayPath))
    )
  }, [selectedAsset?.path, sharedDisplayPrefix])

  useEffect(() => {
    if (!selectedFolderPath) {
      return
    }

    setExpandedFolders((current) =>
      mergeExpandedFolderPaths(
        current,
        [...new Set(listAncestorFolders(selectedFolderPath))]
      )
    )
  }, [selectedFolderPath])

  useEffect(() => {
    const routeSelectionKey = `${client.id}:${initialAssetPath ?? ''}`
    const preferredAssetId = resolveInitialBackgroundAssetId(
      allExposes,
      initialAssetPath
    )
    const displayedAssetStillExists = displayedAssetId
      ? exposesById.has(displayedAssetId)
      : false
    const shouldApplyRouteSelection =
      lastAppliedRouteSelectionKeyRef.current !== routeSelectionKey ||
      !displayedAssetStillExists

    if (!shouldApplyRouteSelection) {
      return
    }

    lastAppliedRouteSelectionKeyRef.current = routeSelectionKey

    if (!preferredAssetId) {
      if (displayedAssetId === undefined && selectedItemId === 'root') {
        return
      }

      setDisplayedAssetId(undefined)
      setSelectedItemId('root')
      setSelectedItemIds([])
      return
    }

    if (
      displayedAssetId === preferredAssetId &&
      selectedItemId === `asset:${preferredAssetId}`
    ) {
      return
    }

    setDisplayedAssetId(preferredAssetId)
    setSelectedItemId(`asset:${preferredAssetId}`)
    setSelectedItemIds([`asset:${preferredAssetId}`])
  }, [
    allExposes,
    client.id,
    displayedAssetId,
    exposesById,
    initialAssetPath,
    selectedItemId
  ])

  useEffect(() => {
    onAssetPathChangeRef.current(selectedAsset?.path, tab)
  }, [selectedAsset?.path, tab])

  useEffect(() => {
    const nextAssetId = getSelectedBackgroundAssetId(selectedItemId)

    if (nextAssetId && displayedAssetId !== nextAssetId) {
      setDisplayedAssetId(nextAssetId)
    }
  }, [displayedAssetId, selectedItemId])

  useEffect(() => {
    if (visibleItemIds.has(selectedItemId)) {
      return
    }

    if (firstSearchResultItemId) {
      setSelectedItemId(firstSearchResultItemId)
      return
    }

    if (!searchTerm) {
      setSelectedItemId('root')
    }
  }, [firstSearchResultItemId, searchTerm, selectedItemId, visibleItemIds])

  useEffect(() => {
    setSelectedItemIds((current) =>
      normalizeTreeSelection(current, orderedVisibleItemIds)
    )
  }, [orderedVisibleItemIds])

  const expandedItems = visibleExpandedFolders.map((path) => `asset-folder:${path}`)

  return {
    allExposes,
    assetEnabled,
    backgroundTree,
    contextMenu,
    dragState,
    dropTargetItemId,
    enabledAssetCount,
    expandedFolders,
    expandedItems,
    exposesById,
    filteredBackgroundTree,
    firstSearchResultItemId,
    hasSearchResults,
    isRequiredClient,
    renameTarget,
    searchInputRef,
    searchQuery,
    searchTerm,
    selectedAsset,
    selectedFolderPath,
    selectedItemId,
    selectedItemIds,
    orderedVisibleItemIds,
    sharedDisplayPrefix,
    tab,
    totalAssetCount,
    setContextMenu,
    setDisplayedAssetId,
    setDragState,
    setDropTargetItemId,
    setExpandedFolders,
    setRenameTarget,
    setSearchQuery,
    setSelectedItemId,
    setSelectedItemIds,
    setTab
  }
}

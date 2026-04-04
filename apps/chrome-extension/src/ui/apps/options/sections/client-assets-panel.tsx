import { Box, Stack } from '@mui/material'
import { SimpleTreeView } from '@mui/x-tree-view'
import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent
} from 'react'

import type {
  ExtensionConfig,
  RouteClientConfig,
  RouteClientRecording,
  RouteExposeAsset,
  RouteSkillEntry,
  RouteSkillFolder
} from '#~/shared/config.js'
import {
  createRouteClientConfig,
  getRootRouteSkillId,
  isRootRouteSkillPath
} from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../../platform/extension-api.js'
import { useI18n } from '../../../i18n/provider.js'
import { createLocalId } from '../types.js'
import {
  AssetEmptyState,
  basename,
  buildAssetFileTree,
  collectAssetFolderPaths,
  filterAssetFileTree,
  listAncestorFolders,
} from './asset-tree-shared.js'
import {
  createUniquePath,
  createUniquePathForMove,
  createUniqueSkillPath,
  dirname,
  getRouteRenameError,
  isPathWithinFolder,
  normalizeMovedLeafName,
  replacePathLeaf,
  replacePathPrefix,
  resolveInitialAssetId
} from './client-assets-panel/asset-helpers.js'
import { buildRouteContextMenuSections } from './client-assets-panel/context-menu.js'
import { RouteCodeEditor, RouteMarkdownEditor } from './client-assets-panel/editors.js'
import { renderTreeNodes } from './client-assets-panel/tree.js'
import type {
  ClientTreeItem,
  DragState,
  RouteRenameTarget,
  TreeContextMenuState
} from './client-assets-panel/types.js'
import { ScriptedAssetWorkspace } from './scripted-asset-workspace.js'
import {
  ScriptedAssetContextMenu,
  type ScriptedAssetContextMenuSection
} from './scripted-asset-shared.js'

export function ClientAssetsPanel({
  client,
  draft,
  initialPath,
  initialTab,
  onSelectedPathChange,
  onChange
}: {
  client: RouteClientConfig
  draft: ExtensionConfig
  initialPath: string | undefined
  initialTab: OptionsAssetsTab | undefined
  onSelectedPathChange: (path: string | undefined) => void
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [selectedItemId, setSelectedItemId] = useState<string>('root')
  const [displayedFileId, setDisplayedFileId] = useState<string>()
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<TreeContextMenuState>()
  const [renameTarget, setRenameTarget] = useState<RouteRenameTarget>()
  const [dragState, setDragState] = useState<DragState>()
  const [dropTargetItemId, setDropTargetItemId] = useState<string>()

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
        searchText: `${asset.metadata.title} ${asset.metadata.summary} ${asset.content}`,
        assetId: asset.id,
        method: undefined
      })),
      ...recordings.map((asset) => ({
        id: asset.id,
        kind: 'flow' as const,
        path: asset.path,
        name: asset.name,
        searchText: `${asset.name} ${asset.description} ${asset.mode}`,
        assetId: asset.id,
        method: asset.method ?? 'POST'
      })),
      ...selectorResources.map((asset) => ({
        id: asset.id,
        kind: 'resource' as const,
        path: asset.path,
        name: asset.name,
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
  const routeTree = useMemo(
    () =>
      buildAssetFileTree(fileItems, (item) => item.searchText, folderAssets.map((folder) => folder.path)),
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
  const displayedAsset = displayedFileId
    ? assetsById.get(displayedFileId)
    : undefined
  const displayedFlow = displayedAsset?.kind === 'flow'
    ? recordings.find((asset) => asset.id === displayedAsset.assetId)
    : undefined
  const displayedSkill = displayedAsset?.kind === 'skill'
    ? skillEntries.find((asset) => asset.id === displayedAsset.assetId)
    : undefined
  const selectedFolderPath = selectedItemId.startsWith('route-asset-folder:')
    ? selectedItemId.slice('route-asset-folder:'.length)
    : undefined
  const selectedResource = displayedAsset?.kind === 'resource'
    ? selectorResources.find((asset) => asset.id === displayedAsset.assetId)
    : undefined
  const renameError = useMemo(
    () => getRouteRenameError(renameTarget, client),
    [client, renameTarget]
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
      setDisplayedFileId(undefined)
      return
    }

    setSelectedItemId(`route-asset:${preferredId}`)
    setDisplayedFileId(preferredId)
  }, [client.id, client.exposes, initialPath, initialTab, rootSkillId])

  useEffect(() => {
    if (!displayedFileId || assetsById.has(displayedFileId)) {
      return
    }

    setDisplayedFileId(rootSkillId)
  }, [assetsById, displayedFileId, rootSkillId])

  useEffect(() => {
    if (!displayedAsset) {
      return
    }

    setExpandedFolders((current) => [
      ...new Set([...current, ...listAncestorFolders(displayedAsset.path)])
    ])
  }, [displayedAsset])

  useEffect(() => {
    onSelectedPathChange(displayedAsset?.path)
  }, [displayedAsset?.path, onSelectedPathChange])

  useEffect(() => {
    if (!selectedFolderPath) {
      return
    }

    setExpandedFolders((current) => [
      ...new Set([...current, ...listAncestorFolders(selectedFolderPath)])
    ])
  }, [selectedFolderPath])

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

  function openItem(itemId: string) {
    setSelectedItemId(itemId)

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

  function resolveCurrentFolderPath() {
    if (selectedFolderPath) {
      return selectedFolderPath
    }

    return displayedAsset ? dirname(displayedAsset.path) : ''
  }

  function addCode(parentPath = resolveCurrentFolderPath()) {
    const path = createUniquePath(
      client.exposes.map((asset) => asset.path),
      parentPath,
      'code'
    )
    const now = new Date().toISOString()
    const nextAsset: RouteClientRecording = {
      kind: 'flow',
      id: createLocalId('flow'),
      path,
      name: 'Code',
      description: '',
      method: 'POST',
      mode: 'script',
      createdAt: now,
      updatedAt: now,
      capturedFeatures: [],
      steps: [],
      scriptSource: `return {\n  ok: true\n}\n`
    }

    commitExposes([nextAsset, ...client.exposes])
    setSelectedItemId(`route-asset:${nextAsset.id}`)
    setDisplayedFileId(nextAsset.id)
  }

  function addMarkdown(parentPath = resolveCurrentFolderPath()) {
    const path = createUniqueSkillPath(
      client.exposes.map((asset) => asset.path),
      parentPath
    )
    const nextAsset: RouteSkillEntry = {
      kind: 'skill',
      id: createLocalId('skill'),
      path,
      metadata: {
        title: t('options.assets.skills.newTitle'),
        summary: '',
        queryParameters: [],
        headerParameters: []
      },
      content: ''
    }

    commitExposes([nextAsset, ...client.exposes])
    setSelectedItemId(`route-asset:${nextAsset.id}`)
    setDisplayedFileId(nextAsset.id)
  }

  function addFolder(parentPath = resolveCurrentFolderPath()) {
    const path = createUniquePath(
      folderAssets.map((asset) => asset.path),
      parentPath,
      'folder'
    )
    const nextAsset: RouteSkillFolder = {
      kind: 'folder',
      id: createLocalId('folder'),
      path
    }

    commitExposes([nextAsset, ...client.exposes])
    setSelectedItemId(`route-asset-folder:${nextAsset.path}`)
    setExpandedFolders((current) => [...new Set([...current, nextAsset.path])])
  }

  function deleteTarget(target: { assetId?: string; folderPath?: string }) {
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
        client.exposes.filter(
          (asset) => !isPathWithinFolder(asset.path, target.folderPath ?? '')
        )
      )
      setSelectedItemId('root')
      setDisplayedFileId(rootSkillId)
    }
  }

  function openContextMenu(
    event: ReactMouseEvent,
    target: {
      kind: 'asset' | 'folder' | 'root'
      assetId?: string
      folderPath: string
      selectedItemId: string
      displayedFileId?: string
    }
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
    if (
      target.kind === 'asset' &&
      isRootRouteSkillPath(target.path)
    ) {
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

      if (!nextLeaf) {
        return
      }

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

    if (!nextLeaf) {
      return
    }

    const nextFolderPath = replacePathLeaf(renameTarget.path, nextLeaf)

    commitExposes(
      client.exposes.map((asset) =>
        isPathWithinFolder(asset.path, renameTarget.path)
          ? {
              ...asset,
              path: replacePathPrefix(asset.path, renameTarget.path, nextFolderPath)
            }
          : asset
      )
    )
    setSelectedItemId(`route-asset-folder:${nextFolderPath}`)
    setExpandedFolders((current) =>
      current
        .filter(
          (path) => path !== renameTarget.path && !path.startsWith(`${renameTarget.path}/`)
        )
        .concat(nextFolderPath)
    )
    setRenameTarget(undefined)
  }

  function copyPath(path: string) {
    void navigator.clipboard.writeText(path)
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

  function moveAssetToFolder(assetId: string, folderPath: string) {
    const asset = client.exposes.find((item) => item.id === assetId)

    if (!asset) {
      return
    }

    if (asset.kind === 'skill' && isRootRouteSkillPath(asset.path)) {
      return
    }

    const nextPath = createUniquePathForMove(
      client.exposes
        .filter((item) => item.id !== assetId)
        .map((item) => item.path),
      folderPath,
      basename(asset.path)
    )

    if (nextPath === asset.path) {
      return
    }

    commitExposes(
      client.exposes.map((item) =>
        item.id === assetId ? { ...item, path: nextPath } : item
      )
    )
    setSelectedItemId(`route-asset:${assetId}`)
    setDisplayedFileId(assetId)
  }

  function moveFolderToFolder(folderPath: string, targetFolderPath: string) {
    if (
      folderPath === targetFolderPath ||
      targetFolderPath.startsWith(`${folderPath}/`)
    ) {
      return
    }

    const nextFolderPath = createUniquePathForMove(
      client.exposes
        .map((item) => item.path)
        .filter((path) => path !== folderPath && !path.startsWith(`${folderPath}/`)),
      targetFolderPath,
      basename(folderPath)
    )

    commitExposes(
      client.exposes.map((item) => {
        if (item.path === folderPath || item.path.startsWith(`${folderPath}/`)) {
          return {
            ...item,
            path: replacePathPrefix(item.path, folderPath, nextFolderPath)
          }
        }

        return item
      })
    )
    setSelectedItemId(`route-asset-folder:${nextFolderPath}`)
    setExpandedFolders((current) =>
      current
        .filter((path) => path !== folderPath && !path.startsWith(`${folderPath}/`))
        .concat(nextFolderPath)
    )
  }

  function handleDrop(folderPath: string, itemId: string) {
    if (!dragState) {
      return
    }

    if (dragState.kind === 'asset') {
      moveAssetToFolder(dragState.assetId, folderPath)
    } else {
      moveFolderToFolder(dragState.path, folderPath)
    }

    setDropTargetItemId(undefined)
    setDragState(undefined)
    setSelectedItemId(itemId)
  }

  const expandedItems = [...new Set([...expandedFolders, ...forcedExpandedFolders])].map(
    (path) => `route-asset-folder:${path}`
  )
  const contextAsset = contextMenu?.assetId
    ? client.exposes.find((asset) => asset.id === contextMenu.assetId)
    : undefined
  const contextMenuSections: ScriptedAssetContextMenuSection[] = contextMenu
    ? buildRouteContextMenuSections({
        contextMenu,
        contextAsset,
        expandedFolders,
        t,
        addCode,
        addMarkdown,
        addFolder,
        collapseAllFolders,
        copyPath,
        deleteTarget,
        expandAllFolders,
        startRename,
        toggleFolder
      })
    : []

  return (
    <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0 }}>
      <ScriptedAssetWorkspace
        detailPane={
          displayedSkill ? (
            <RouteMarkdownEditor
              asset={displayedSkill}
              onChange={(nextSkill) => {
                replaceExposeKind(
                  'skill',
                  skillEntries.map((item) =>
                    item.id === nextSkill.id ? nextSkill : item
                  )
                )
              }}
            />
          ) : displayedFlow ? (
            <RouteCodeEditor
              asset={displayedFlow}
              onChange={(nextFlow) => {
                replaceExposeKind(
                  'flow',
                  recordings.map((item) =>
                    item.id === nextFlow.id ? nextFlow : item
                  )
                )
              }}
            />
          ) : selectedResource ? (
            <RouteCodeEditor
              asset={selectedResource}
              onChange={(nextResource) => {
                replaceExposeKind(
                  'resource',
                  selectorResources.map((item) =>
                    item.id === nextResource.id ? nextResource : item
                  )
                )
              }}
            />
          ) : (
            <AssetEmptyState label={t('options.assets.skills.noSelection')} minHeight={220} />
          )
        }
        onRootContextMenu={(event) =>
          openContextMenu(event, {
            kind: 'root',
            folderPath: '',
            selectedItemId: 'root'
          })
        }
        onRootDragOver={(event) => {
          event.preventDefault()
          setDropTargetItemId('root')
        }}
        onRootDragLeave={() =>
          setDropTargetItemId((current) =>
            current === 'root' ? undefined : current
          )
        }
        onRootDrop={(event) => {
          event.preventDefault()
          handleDrop('', 'root')
        }}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('options.assets.search')}
        searchQuery={searchQuery}
        storageKey="mdp-options-route-asset-tree-width"
        treePane={
          fileItems.length === 0 ? (
            <AssetEmptyState label={t('options.assets.searchEmpty')} minHeight={180} />
          ) : (
            <SimpleTreeView
              expandedItems={expandedItems}
              selectedItems={selectedItemId === 'root' ? null : selectedItemId}
              sx={{
                minWidth: 0,
                px: 0.5,
                '& .MuiTreeItem-content': {
                  minHeight: 32,
                  pr: 0.5,
                  borderRadius: 1,
                  width: '100%',
                  cursor: 'pointer'
                },
                '& .MuiTreeItem-label': {
                  flex: 1,
                  minWidth: 0
                }
              }}
            >
              {renderTreeNodes(filteredTree, {
                onCancelRename: () => setRenameTarget(undefined),
                onCommitRename: commitRename,
                onOpenItem: openItem,
                onOpenContextMenu: openContextMenu,
                onRenameChange: (value) =>
                  setRenameTarget((current) =>
                    current ? { ...current, value } : current
                  ),
                onStartRename: startRename,
                onDropItem: handleDrop,
                onSetDropTarget: setDropTargetItemId,
                onStartDrag: setDragState,
                dropTargetItemId,
                renameLabel: t('options.assets.renameItem'),
                renameError,
                renameTarget,
                searchTerm: searchQuery,
                assetKinds,
                assetMethods
              })}
            </SimpleTreeView>
          )
        }
      />

      <ScriptedAssetContextMenu
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        onClose={() => setContextMenu(undefined)}
        open={Boolean(contextMenu)}
        sections={contextMenuSections}
      />
    </Stack>
  )
}

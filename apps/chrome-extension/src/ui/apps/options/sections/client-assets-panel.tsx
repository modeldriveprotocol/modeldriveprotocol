import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import JavascriptOutlined from '@mui/icons-material/JavascriptOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import UnfoldLessOutlined from '@mui/icons-material/UnfoldLessOutlined'
import UnfoldMoreOutlined from '@mui/icons-material/UnfoldMoreOutlined'
import {
  Box,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view'
import {
  useEffect,
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from 'react'

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
  ROOT_ROUTE_SKILL_PATH,
  createRouteClientConfig,
  getRootRouteSkillId,
  isRootRouteSkillPath
} from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../../platform/extension-api.js'
import { useI18n } from '../../../i18n/provider.js'
import { createLocalId } from '../types.js'
import {
  AssetEmptyState,
  AssetTreeAction,
  AssetTreeRenameField,
  AssetTreeLabel,
  AssetTreeLeaf,
  basename,
  buildAssetFileTree,
  collectAssetFolderPaths,
  filterAssetFileTree,
  listAncestorFolders,
  renderHighlightedText,
  type AssetFileTreeNode
} from './asset-tree-shared.js'
import {
  HttpMethodBadge,
  ScriptedAssetContextMenu,
  ScriptedAssetEditorPanel,
  ScriptedAssetMethodField,
  type ScriptedAssetContextMenuSection
} from './scripted-asset-shared.js'

type ClientTreeItem =
  | {
      id: string
      kind: 'flow' | 'resource' | 'skill'
      path: string
      name: string
      searchText: string
      assetId: string
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    }

type TreeContextMenuState = {
  kind: 'asset' | 'folder' | 'root'
  assetId?: string
  folderPath: string
  mouseX: number
  mouseY: number
}

type RouteRenameTarget =
  | {
      kind: 'asset'
      assetId: string
      path: string
      value: string
    }
  | {
      kind: 'folder'
      path: string
      value: string
    }

type DragState =
  | {
      kind: 'asset'
      assetId: string
      path: string
    }
  | {
      kind: 'folder'
      path: string
    }

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

    setSelectedItemId(target.selectedItemId)

    if (target.displayedFileId) {
      setDisplayedFileId(target.displayedFileId)
    }

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
      <Typography variant="body2" color="text.secondary">
        {t('options.assets.description')}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)',
          gap: 1.5,
          flex: 1,
          minHeight: 0
        }}
      >
        <Stack
          spacing={1}
          sx={{
            minHeight: 0,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            p: 1.25,
            overflow: 'hidden'
          }}
        >
          <TextField
            placeholder={t('options.assets.search')}
            size="small"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              )
            }}
          />

          <Box
            sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}
            onContextMenu={(event) =>
              openContextMenu(event, {
                kind: 'root',
                folderPath: '',
                selectedItemId: 'root'
              })
            }
            onDragOver={(event) => {
              event.preventDefault()
              setDropTargetItemId('root')
            }}
            onDragLeave={() =>
              setDropTargetItemId((current) =>
                current === 'root' ? undefined : current
              )
            }
            onDrop={(event) => {
              event.preventDefault()
              handleDrop('', 'root')
            }}
          >
            {fileItems.length === 0 ? (
              <AssetEmptyState label={t('options.assets.searchEmpty')} minHeight={180} />
            ) : (
              <SimpleTreeView
                expandedItems={expandedItems}
                selectedItems={selectedItemId === 'root' ? undefined : selectedItemId}
                sx={{
                  minWidth: 0,
                  '& .MuiTreeItem-content': {
                    borderRadius: 2,
                    py: 0.5
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
            )}
          </Box>
        </Stack>

        <Box
          sx={{
            minHeight: 0,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            p: 1.25,
            overflowY: 'auto'
          }}
        >
          {displayedSkill ? (
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
          )}
        </Box>
      </Box>

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

function RouteMarkdownEditor({
  asset,
  onChange
}: {
  asset: RouteSkillEntry
  onChange: (next: RouteSkillEntry) => void
}) {
  const { t } = useI18n()

  return (
    <ScriptedAssetEditorPanel
      descriptionLabel={t('common.description')}
      descriptionValue={asset.metadata.summary}
      editorLabel={t('options.assets.skills.markdown')}
      editorLanguage="markdown"
      editorMinHeight={420}
      editorModelUri={`inmemory://route-assets/${asset.id}.md`}
      editorValue={asset.content}
      onDescriptionChange={(summary) =>
        onChange({
          ...asset,
          metadata: {
            ...asset.metadata,
            summary,
            title: asset.metadata.title || basename(dirname(asset.path) || asset.path)
          }
        })
      }
      onEditorChange={(content) =>
        onChange({
          ...asset,
          content
        })
      }
    />
  )
}

function RouteCodeEditor({
  asset,
  onChange
}: {
  asset: RouteClientRecording | RouteSelectorResource
  onChange: (next: RouteClientRecording | RouteSelectorResource) => void
}) {
  const { t } = useI18n()
  const method = resolveRouteCodeAssetMethod(asset)
  const source = resolveRouteCodeAssetSource(asset)

  return (
    <ScriptedAssetEditorPanel
      controls={
        <ScriptedAssetMethodField
          label="Method"
          method={method}
          onChange={(nextMethod) =>
            onChange({
              ...asset,
              method: nextMethod
            })
          }
          sx={{ maxWidth: 180 }}
        />
      }
      descriptionLabel={t('common.description')}
      descriptionValue={asset.description}
      editorLabel={t('options.assets.flows.scriptEditor')}
      editorLanguage="javascript"
      editorMinHeight={420}
      editorModelUri={`inmemory://route-assets/${asset.id}.js`}
      editorValue={source}
      onDescriptionChange={(description) =>
        onChange({
          ...asset,
          description
        })
      }
      onEditorChange={(nextValue) =>
        onChange(updateRouteCodeAssetSource(asset, nextValue, method))
      }
    />
  )
}

function renderTreeNodes(
  nodes: AssetFileTreeNode[],
  options: {
    onCancelRename: () => void
    onOpenItem: (itemId: string) => void
    onCommitRename: () => void
    onOpenContextMenu: (
      event: ReactMouseEvent,
      target: {
        kind: 'asset' | 'folder' | 'root'
        assetId?: string
        folderPath: string
        selectedItemId: string
        displayedFileId?: string
      }
    ) => void
    onRenameChange: (value: string) => void
    onStartRename: (target: RouteRenameTarget, itemId: string) => void
    onDropItem: (folderPath: string, itemId: string) => void
    onSetDropTarget: (itemId: string | undefined) => void
    onStartDrag: (value: DragState | undefined) => void
    dropTargetItemId: string | undefined
    renameLabel: string
    renameError: boolean
    renameTarget: RouteRenameTarget | undefined
    searchTerm: string
    assetKinds: Map<string, ClientTreeItem['kind']>
    assetMethods: Map<
      string,
      'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | undefined
    >
  }
): ReactNode {
  return nodes.map((node) => {
    if (node.kind === 'folder') {
      const itemId = `route-asset-folder:${node.path}`
      return (
        <TreeItem
          key={itemId}
          itemId={itemId}
          label={
            <Box
              draggable
              onContextMenu={(event) =>
                options.onOpenContextMenu(event, {
                  kind: 'folder',
                  folderPath: node.path,
                  selectedItemId: itemId
                })
              }
              onDoubleClick={() =>
                options.onStartRename(
                  {
                    kind: 'folder',
                    path: node.path,
                    value: node.label
                  },
                  itemId
                )
              }
              onDragStart={() =>
                options.onStartDrag({
                  kind: 'folder',
                  path: node.path
                })
              }
              onDragEnd={() => {
                options.onStartDrag(undefined)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.stopPropagation()
                options.onSetDropTarget(itemId)
              }}
              onDragLeave={() =>
                options.onSetDropTarget(undefined)
              }
              onDrop={(event) => {
                event.preventDefault()
                event.stopPropagation()
                options.onDropItem(node.path, itemId)
              }}
            >
              <AssetTreeLabel
                action={
                  <AssetTreeAction
                    label={options.renameLabel}
                    onClick={() =>
                      options.onStartRename(
                        {
                          kind: 'folder',
                          path: node.path,
                          value: node.label
                        },
                        itemId
                      )
                    }
                  >
                    <EditOutlined fontSize="inherit" />
                  </AssetTreeAction>
                }
                count={countTreeFiles(node.children)}
                dropActive={options.dropTargetItemId === itemId}
                label={
                  options.renameTarget?.kind === 'folder' &&
                  options.renameTarget.path === node.path ? (
                    <AssetTreeRenameField
                      error={options.renameError}
                      onCancel={options.onCancelRename}
                      onChange={options.onRenameChange}
                      onCommit={options.onCommitRename}
                      value={options.renameTarget.value}
                    />
                  ) : (
                    node.label
                  )
                }
                onClick={() => options.onOpenItem(itemId)}
                searchTerm={options.searchTerm}
              />
            </Box>
          }
        >
          {renderTreeNodes(node.children, options)}
        </TreeItem>
      )
    }

    const itemId = `route-asset:${node.assetId}`
    return (
        <TreeItem
          key={itemId}
          itemId={itemId}
          label={
            <Box
              draggable={
                !(
                  options.assetKinds.get(node.assetId) === 'skill' &&
                  node.path === ROOT_ROUTE_SKILL_PATH
                )
              }
              onContextMenu={(event) =>
                options.onOpenContextMenu(event, {
                  kind: 'asset',
                  assetId: node.assetId,
                  folderPath: dirname(node.path),
                  selectedItemId: itemId,
                  displayedFileId: node.assetId
                })
              }
              onDoubleClick={() => {
                if (
                  options.assetKinds.get(node.assetId) === 'skill' &&
                  node.path === ROOT_ROUTE_SKILL_PATH
                ) {
                  return
                }

                options.onStartRename(
                  {
                    kind: 'asset',
                    assetId: node.assetId,
                    path: node.path,
                    value: node.label
                  },
                  itemId
                )
              }}
              onDragStart={() =>
                options.onStartDrag({
                  kind: 'asset',
                  assetId: node.assetId,
                  path: node.path
                })
              }
              onDragEnd={() => {
                options.onStartDrag(undefined)
              }}
            >
              <AssetTreeLeaf
                action={
                  !(
                    options.assetKinds.get(node.assetId) === 'skill' &&
                    node.path === ROOT_ROUTE_SKILL_PATH
                  ) ? (
                    <AssetTreeAction
                      label={options.renameLabel}
                      onClick={() =>
                        options.onStartRename(
                          {
                            kind: 'asset',
                            assetId: node.assetId,
                            path: node.path,
                            value: node.label
                          },
                          itemId
                        )
                      }
                    >
                      <EditOutlined fontSize="inherit" />
                    </AssetTreeAction>
                  ) : undefined
                }
                icon={
                  <HttpMethodBadge
                    fallback={resolveAssetBadge(options.assetKinds.get(node.assetId) ?? 'skill')}
                    method={options.assetMethods.get(node.assetId)}
                  />
                }
                label={
                  options.renameTarget?.kind === 'asset' &&
                  options.renameTarget.assetId === node.assetId ? (
                    <AssetTreeRenameField
                      error={options.renameError}
                      onCancel={options.onCancelRename}
                      onChange={options.onRenameChange}
                      onCommit={options.onCommitRename}
                      value={options.renameTarget.value}
                    />
                  ) : (
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {renderHighlightedText(node.label, options.searchTerm)}
                    </Typography>
                  )
                }
                onClick={() => options.onOpenItem(itemId)}
              />
            </Box>
          }
        />
      )
  })
}

function buildRouteContextMenuSections(options: {
  contextMenu: TreeContextMenuState
  contextAsset: RouteExposeAsset | undefined
  expandedFolders: string[]
  t: (key: string) => string
  addCode: (parentPath?: string) => void
  addMarkdown: (parentPath?: string) => void
  addFolder: (parentPath?: string) => void
  collapseAllFolders: () => void
  copyPath: (path: string) => void
  deleteTarget: (target: { assetId?: string; folderPath?: string }) => void
  expandAllFolders: () => void
  startRename: (target: RouteRenameTarget, itemId: string) => void
  toggleFolder: (folderPath: string) => void
}): ScriptedAssetContextMenuSection[] {
  const { contextAsset, contextMenu, expandedFolders, t } = options
  const isRootSkill =
    contextAsset?.kind === 'skill' && isRootRouteSkillPath(contextAsset.path)
  const isExpanded =
    contextMenu.kind === 'folder' &&
    expandedFolders.includes(contextMenu.folderPath)

  if (contextMenu.kind === 'root') {
    return [
      {
        key: 'create',
        title: t('options.assets.menu.section.create'),
        items: [
          {
            key: 'new-code',
            label: t('options.assets.menu.newCode'),
            icon: <JavascriptOutlined fontSize="small" />,
            onSelect: () => options.addCode('')
          },
          {
            key: 'new-skill',
            label: t('options.assets.menu.newSkill'),
            icon: <DescriptionOutlined fontSize="small" />,
            onSelect: () => options.addMarkdown('')
          },
          {
            key: 'new-folder',
            label: t('options.assets.menu.newFolder'),
            icon: <FolderOutlined fontSize="small" />,
            onSelect: () => options.addFolder('')
          }
        ]
      },
      {
        key: 'tree',
        title: t('options.assets.menu.section.tree'),
        items: [
          {
            key: 'expand-all',
            label: t('options.assets.menu.expandAll'),
            icon: <UnfoldMoreOutlined fontSize="small" />,
            onSelect: options.expandAllFolders
          },
          {
            key: 'collapse-all',
            label: t('options.assets.menu.collapseAll'),
            icon: <UnfoldLessOutlined fontSize="small" />,
            onSelect: options.collapseAllFolders
          }
        ]
      }
    ]
  }

  if (contextMenu.kind === 'folder') {
    return [
      {
        key: 'create',
        title: t('options.assets.menu.section.createInFolder'),
        items: [
          {
            key: 'new-code',
            label: t('options.assets.menu.newCode'),
            icon: <JavascriptOutlined fontSize="small" />,
            onSelect: () => options.addCode(contextMenu.folderPath)
          },
          {
            key: 'new-skill',
            label: t('options.assets.menu.newSkill'),
            icon: <DescriptionOutlined fontSize="small" />,
            onSelect: () => options.addMarkdown(contextMenu.folderPath)
          },
          {
            key: 'new-folder',
            label: t('options.assets.menu.newFolder'),
            icon: <FolderOutlined fontSize="small" />,
            onSelect: () => options.addFolder(contextMenu.folderPath)
          }
        ]
      },
      {
        key: 'folder',
        title: t('options.assets.menu.section.folder'),
        items: [
          {
            key: isExpanded ? 'collapse' : 'expand',
            label: isExpanded
              ? t('options.assets.menu.collapseFolder')
              : t('options.assets.menu.expandFolder'),
            icon: isExpanded ? (
              <UnfoldLessOutlined fontSize="small" />
            ) : (
              <UnfoldMoreOutlined fontSize="small" />
            ),
            onSelect: () => options.toggleFolder(contextMenu.folderPath)
          },
          {
            key: 'rename',
            label: t('options.assets.renameItem'),
            icon: <EditOutlined fontSize="small" />,
            onSelect: () =>
              options.startRename(
                {
                  kind: 'folder',
                  path: contextMenu.folderPath,
                  value: basename(contextMenu.folderPath)
                },
                `route-asset-folder:${contextMenu.folderPath}`
              )
          },
          {
            key: 'copy-path',
            label: t('options.assets.menu.copyPath'),
            icon: <ContentCopyOutlined fontSize="small" />,
            onSelect: () => options.copyPath(contextMenu.folderPath)
          },
          {
            key: 'delete',
            label: t('options.assets.deleteFolder'),
            icon: <DeleteOutlineOutlined fontSize="small" />,
            tone: 'danger',
            onSelect: () =>
              options.deleteTarget({
                folderPath: contextMenu.folderPath
              })
          }
        ]
      }
    ]
  }

  return [
    {
      key: 'file',
      title: t('options.assets.menu.section.file'),
      items: [
        {
          key: 'rename',
          label: t('options.assets.renameItem'),
          icon: <EditOutlined fontSize="small" />,
          disabled: !contextAsset || isRootSkill,
          onSelect: () =>
            contextAsset
              ? options.startRename(
                  {
                    kind: 'asset',
                    assetId: contextAsset.id,
                    path: contextAsset.path,
                    value: basename(contextAsset.path)
                  },
                  `route-asset:${contextAsset.id}`
                )
              : undefined
        },
        {
          key: 'copy-path',
          label: t('options.assets.menu.copyPath'),
          icon: <ContentCopyOutlined fontSize="small" />,
          disabled: !contextAsset,
          onSelect: () => (contextAsset ? options.copyPath(contextAsset.path) : undefined)
        },
        {
          key: 'delete',
          label: t('options.assets.deleteItem'),
          icon: <DeleteOutlineOutlined fontSize="small" />,
          disabled: !contextAsset || isRootSkill,
          tone: 'danger',
          onSelect: () =>
            options.deleteTarget({
              assetId: contextAsset?.id
            })
        }
      ]
    }
  ]
}

function resolveAssetBadge(kind: ClientTreeItem['kind']): 'G' | 'P' | 'M' {
  if (kind === 'skill') {
    return 'M'
  }

  return kind === 'resource' ? 'G' : 'P'
}

function resolveInitialAssetId(
  client: RouteClientConfig,
  initialPath: string | undefined,
  initialTab: OptionsAssetsTab | undefined,
  rootSkillId: string | undefined
): string | undefined {
  if (initialPath) {
    const matchedAsset = client.exposes.find(
      (asset) => asset.kind !== 'folder' && asset.path === initialPath
    )

    if (matchedAsset && matchedAsset.kind !== 'folder') {
      return matchedAsset.id
    }
  }

  if (initialTab === 'flows') {
    return client.recordings[0]?.id ?? rootSkillId
  }

  if (initialTab === 'resources') {
    return client.selectorResources[0]?.id ?? rootSkillId
  }

  return rootSkillId ?? client.skillEntries[0]?.id ?? client.exposes[0]?.id
}

function countTreeFiles(nodes: AssetFileTreeNode[]): number {
  return nodes.reduce(
    (count, node) =>
      count + (node.kind === 'folder' ? countTreeFiles(node.children) : 1),
    0
  )
}

function dirname(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts.slice(0, -1).join('/')
}

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
}

function createUniquePath(
  existingPaths: string[],
  parentPath: string,
  baseName: string
): string {
  const slug = slugifySegment(baseName) || 'asset'
  const prefix = parentPath ? `${parentPath}/${slug}` : slug
  let candidate = prefix
  let counter = 2
  const used = new Set(existingPaths)

  while (used.has(candidate)) {
    candidate = `${prefix}-${counter}`
    counter += 1
  }

  return candidate
}

function createUniqueSkillPath(existingPaths: string[], parentPath: string): string {
  const folderBase = createUniquePath(
    existingPaths.map((path) => dirname(path)),
    parentPath,
    'skill'
  )
  let candidate = `${folderBase}/${ROOT_ROUTE_SKILL_PATH}`
  let counter = 2
  const used = new Set(existingPaths)

  while (used.has(candidate)) {
    candidate = `${folderBase}-${counter}/${ROOT_ROUTE_SKILL_PATH}`
    counter += 1
  }

  return candidate
}

function isPathWithinFolder(path: string, folderPath: string): boolean {
  return path === folderPath || path.startsWith(`${folderPath}/`)
}

function resolveRouteCodeAssetMethod(
  asset: RouteClientRecording | RouteSelectorResource
): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' {
  if (asset.method) {
    return asset.method
  }

  return asset.kind === 'resource' ? 'GET' : 'POST'
}

function resolveRouteCodeAssetSource(
  asset: RouteClientRecording | RouteSelectorResource
): string {
  if (asset.kind === 'resource') {
    return (
      asset.scriptSource ??
      `return ${JSON.stringify(
        {
          selector: asset.selector,
          alternativeSelectors: asset.alternativeSelectors,
          tagName: asset.tagName,
          classes: asset.classes,
          text: asset.text,
          attributes: asset.attributes
        },
        null,
        2
      )}\n`
    )
  }

  if (asset.mode === 'script' && asset.scriptSource.trim()) {
    return asset.scriptSource
  }

  return `// Recorded flow (${asset.steps.length} step${asset.steps.length === 1 ? '' : 's'})\n// Edit this file to replace the legacy recording with code.\nreturn {\n  steps: ${asset.steps.length}\n}\n`
}

function updateRouteCodeAssetSource(
  asset: RouteClientRecording | RouteSelectorResource,
  source: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
): RouteClientRecording | RouteSelectorResource {
  if (asset.kind === 'resource') {
    return {
      ...asset,
      method,
      scriptSource: source
    }
  }

  return {
    ...asset,
    method,
    mode: 'script',
    scriptSource: source
  }
}

function getRouteRenameError(
  target: RouteRenameTarget | undefined,
  client: RouteClientConfig
): boolean {
  if (!target) {
    return false
  }

  if (target.kind === 'asset') {
    if (isRootRouteSkillPath(target.path)) {
      return true
    }

    const nextLeaf = normalizeMovedLeafName(target.value)

    if (!nextLeaf) {
      return true
    }

    return pathExistsInRouteExposes(
      client.exposes,
      replacePathLeaf(target.path, nextLeaf),
      target.assetId
    )
  }

  const nextLeaf = normalizeMovedLeafName(target.value)

  if (!nextLeaf) {
    return true
  }

  const nextFolderPath = replacePathLeaf(target.path, nextLeaf)
  const unaffected = client.exposes.filter(
    (asset) => !isPathWithinFolder(asset.path, target.path)
  )
  const renamedPaths = client.exposes
    .filter((asset) => isPathWithinFolder(asset.path, target.path))
    .map((asset) => replacePathPrefix(asset.path, target.path, nextFolderPath))
  const existing = new Set(unaffected.map((asset) => asset.path))

  if (renamedPaths.some((path) => existing.has(path))) {
    return true
  }

  return new Set(renamedPaths).size !== renamedPaths.length
}

function pathExistsInRouteExposes(
  exposes: RouteExposeAsset[],
  nextPath: string,
  currentId?: string
): boolean {
  return exposes.some(
    (asset) => asset.id !== currentId && asset.path === nextPath
  )
}

function replacePathLeaf(path: string, nextLeaf: string): string {
  const parentPath = dirname(path)
  return parentPath ? `${parentPath}/${nextLeaf}` : nextLeaf
}

function replacePathPrefix(
  path: string,
  currentPrefix: string,
  nextPrefix: string
): string {
  if (path === currentPrefix) {
    return nextPrefix
  }

  return `${nextPrefix}/${path.slice(currentPrefix.length + 1)}`
}

function createUniquePathForMove(
  existingPaths: string[],
  parentPath: string,
  leafName: string
): string {
  const safeLeafName = normalizeMovedLeafName(leafName)
  const basePath = parentPath ? `${parentPath}/${safeLeafName}` : safeLeafName
  let candidate = basePath
  let counter = 2
  const used = new Set(existingPaths)

  while (used.has(candidate)) {
    candidate = `${basePath}-${counter}`
    counter += 1
  }

  return candidate
}

function normalizeMovedLeafName(value: string): string {
  if (/^skill\.md$/i.test(value)) {
    return 'SKILL.md'
  }

  if (value === '.ai') {
    return '.ai'
  }

  return slugifySegment(value) || 'asset'
}

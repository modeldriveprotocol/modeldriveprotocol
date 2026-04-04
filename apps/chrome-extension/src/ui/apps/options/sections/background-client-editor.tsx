import CloseOutlined from '@mui/icons-material/CloseOutlined'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import UnfoldLessOutlined from '@mui/icons-material/UnfoldLessOutlined'
import UnfoldMoreOutlined from '@mui/icons-material/UnfoldMoreOutlined'
import {
  Box,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material'
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view'
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

import {
  countEnabledBackgroundExposes,
  deriveDisabledBackgroundExposePaths,
  getBackgroundExposeDefinition,
  isRequiredBackgroundClientId,
  type BackgroundClientConfig,
  type BackgroundExposeAsset,
  type ExtensionConfig
} from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import { IconPicker } from '../icon-picker.js'
import type { ClientDetailTab } from '../types.js'
import {
  AssetEmptyState,
  AssetTreeAction,
  AssetTreeLabel,
  AssetTreeLeaf,
  AssetTreeRenameField,
  basename,
  dirname,
  buildAssetFileTree,
  collectAssetFolderPaths,
  collectAssetItemIds,
  filterAssetFileTree,
  findFirstAssetTreeItemId,
  listAncestorFolders,
  renderHighlightedText,
  type AssetFileTreeNode
} from './asset-tree-shared.js'
import { ClientInvocationPanel } from './invocation-insights.js'
import {
  HttpMethodBadge,
  ScriptedAssetContextMenu,
  ScriptedAssetEditorPanel,
  type ScriptedAssetContextMenuSection
} from './scripted-asset-shared.js'

type BackgroundTreePrefix = 'asset'
type BackgroundRenameTarget =
  | {
      kind: 'asset'
      assetId: BackgroundExposeAsset['id']
      path: string
      value: string
    }
  | {
      kind: 'folder'
      path: string
      value: string
    }

type BackgroundContextMenuState = {
  kind: 'asset' | 'folder' | 'root'
  assetId?: BackgroundExposeAsset['id']
  folderPath?: string
  mouseX: number
  mouseY: number
}

const BACKGROUND_ASSET_TREE_WIDTH_STORAGE_KEY =
  'mdp-options-background-asset-tree-width'

export function BackgroundClientEditor({
  client,
  draft,
  initialAssetPath,
  initialTab,
  invocationStats,
  onClearHistory,
  onAssetPathChange,
  onTabChange,
  runtimeState,
  onChange
}: {
  client: BackgroundClientConfig
  draft: ExtensionConfig
  initialAssetPath: string | undefined
  initialTab: ClientDetailTab | undefined
  invocationStats: PopupState['clients'][number]['invocationStats'] | undefined
  onClearHistory: () => void
  onAssetPathChange: (
    path: string | undefined,
    tab: 'basics' | 'assets' | 'activity'
  ) => void
  onTabChange: (tab: 'basics' | 'assets' | 'activity') => void
  runtimeState: PopupState['clients'][number]['connectionState'] | undefined
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'basics' | 'assets' | 'activity'>(
    initialTab === 'activity'
      ? 'activity'
      : initialTab === 'assets'
        ? 'assets'
        : 'basics'
  )
  const [selectedItemId, setSelectedItemId] = useState<string>('root')
  const [displayedAssetId, setDisplayedAssetId] = useState<
    BackgroundExposeAsset['id'] | undefined
  >()
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [renameTarget, setRenameTarget] = useState<BackgroundRenameTarget>()
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<
    BackgroundContextMenuState | undefined
  >()
  const [treeWidth, setTreeWidth] = useState(272)
  const [isResizingTree, setIsResizingTree] = useState(false)
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setTab(
      initialTab === 'activity'
        ? 'activity'
        : initialTab === 'assets'
          ? 'assets'
          : 'basics'
    )
  }, [client.id, initialTab])

  useEffect(() => {
    onTabChange(tab)
  }, [onTabChange, tab])

  useEffect(() => {
    const savedWidth = Number(
      globalThis.localStorage?.getItem(BACKGROUND_ASSET_TREE_WIDTH_STORAGE_KEY)
    )

    if (Number.isFinite(savedWidth) && savedWidth >= 180 && savedWidth <= 420) {
      setTreeWidth(savedWidth)
    }
  }, [])

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

  const allExposes = client.exposes
  const enabledAssetCount = countEnabledBackgroundExposes(client)
  const totalAssetCount = client.exposes.length
  const isRequiredClient = isRequiredBackgroundClientId(client.id)
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
  const visibleItemIds = useMemo(
    () =>
      new Set([
        'root',
        ...collectAssetItemIds('asset', filteredBackgroundTree)
      ]),
    [filteredBackgroundTree]
  )
  const hasSearchResults = visibleItemIds.size > 1
  const searchTerm = searchQuery.trim()
  const selectedTreeItemId =
    selectedItemId !== 'root' && visibleItemIds.has(selectedItemId)
    ? selectedItemId
    : undefined
  const firstSearchResultItemId = useMemo(
    () => (searchTerm ? findFirstAssetTreeItemId('asset', filteredBackgroundTree) : undefined),
    [filteredBackgroundTree, searchTerm]
  )
  const selectedAssetId =
    displayedAssetId ?? getPreferredBackgroundAssetId(allExposes)
  const selectedAsset = selectedAssetId
    ? exposesById.get(selectedAssetId)
    : undefined
  const selectedFolderPath = getSelectedBackgroundFolderPath(selectedItemId)
  const renameError = useMemo(
    () => getBackgroundRenameError(renameTarget, client, sharedDisplayPrefix),
    [client, renameTarget, sharedDisplayPrefix]
  )
  const contextAsset = contextMenu?.assetId
    ? exposesById.get(contextMenu.assetId)
    : undefined
  const contextMenuSections: ScriptedAssetContextMenuSection[] = contextMenu
    ? buildBackgroundContextMenuSections({
        contextAsset,
      contextMenu,
        expandedFolders,
        sharedDisplayPrefix,
        t,
        copyPath: (path) => {
          void navigator.clipboard.writeText(path)
        },
        collapseAllFolders: () => setExpandedFolders([]),
        expandAllFolders: () =>
          setExpandedFolders(collectAssetFolderPaths(backgroundTree)),
        startRename: (target, itemId) => {
          setRenameTarget(target)
          setSelectedItemId(itemId)
          if (target.kind === 'asset') {
            setDisplayedAssetId(target.assetId)
          }
        },
        toggleFolder: (folderPath) =>
          setExpandedFolders((current) =>
            current.includes(folderPath)
              ? current.filter((path) => path !== folderPath)
              : [...current, folderPath]
          )
      })
    : []

  useEffect(() => {
    if (!selectedAsset) {
      return
    }

    const displayPath = getBackgroundDisplayPath(
      selectedAsset.path,
      sharedDisplayPrefix
    )
    setExpandedFolders((current) => [
      ...new Set([...current, ...listAncestorFolders(displayPath)])
    ])
  }, [selectedAsset, sharedDisplayPrefix])

  useEffect(() => {
    if (!selectedFolderPath) {
      return
    }

    const nextPaths = [...new Set(listAncestorFolders(selectedFolderPath))]
    setExpandedFolders((current) => [...new Set([...current, ...nextPaths])])
  }, [selectedFolderPath])

  useEffect(() => {
    const preferredAssetId = resolveInitialBackgroundAssetId(
      allExposes,
      initialAssetPath
    )

    if (!preferredAssetId) {
      setDisplayedAssetId(undefined)
      setSelectedItemId('root')
      return
    }

    const currentAssetPath = displayedAssetId
      ? exposesById.get(displayedAssetId)?.path
      : undefined

    if (
      displayedAssetId === preferredAssetId &&
      (!initialAssetPath || currentAssetPath === initialAssetPath)
    ) {
      return
    }

    setDisplayedAssetId(preferredAssetId)
    setSelectedItemId(`asset:${preferredAssetId}`)
  }, [allExposes, displayedAssetId, exposesById, initialAssetPath])

  useEffect(() => {
    onAssetPathChange(selectedAsset?.path, tab)
  }, [onAssetPathChange, selectedAsset?.path, tab])

  useEffect(() => {
    if (visibleItemIds.has(selectedItemId)) {
      return
    }

    if (firstSearchResultItemId) {
      setSelectedItemId(firstSearchResultItemId)
      return
    }

    if (searchTerm) {
      return
    }

    setSelectedItemId('root')
  }, [
    firstSearchResultItemId,
    searchTerm,
    selectedItemId,
    visibleItemIds
  ])

  useEffect(() => {
    if (!isResizingTree) {
      return
    }

    function handlePointerMove(event: MouseEvent) {
      const rect = layoutRef.current?.getBoundingClientRect()

      if (!rect) {
        return
      }

      const nextWidth = Math.min(
        420,
        Math.max(180, Math.round(event.clientX - rect.left))
      )

      setTreeWidth(nextWidth)
    }

    function handlePointerUp() {
      setIsResizingTree(false)
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
    }
  }, [isResizingTree])

  useEffect(() => {
    globalThis.localStorage?.setItem(
      BACKGROUND_ASSET_TREE_WIDTH_STORAGE_KEY,
      String(treeWidth)
    )
  }, [treeWidth])

  const expandedItems = [...new Set([...expandedFolders, ...forcedExpandedFolders])].map(
    (path) => `asset-folder:${path}`
  )

  const assetTreeSx = {
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
    },
    '& .asset-tree-actions': {
      opacity: 0,
      pointerEvents: 'none',
      transition: 'opacity 120ms ease'
    },
    '& .MuiTreeItem-content:hover .asset-tree-actions, & .MuiTreeItem-content.Mui-selected .asset-tree-actions':
      {
        opacity: 1,
        pointerEvents: 'auto'
      }
  }

  function openContextMenu(
    event: ReactMouseEvent,
    target: {
      kind: 'asset' | 'folder' | 'root'
      assetId?: BackgroundExposeAsset['id']
      folderPath?: string
      itemId?: string
    }
  ) {
    event.preventDefault()
    event.stopPropagation()

    if (target.itemId) {
      setSelectedItemId(target.itemId)
    }
    if (target.assetId) {
      setDisplayedAssetId(target.assetId)
    }

    setContextMenu({
      kind: target.kind,
      assetId: target.assetId,
      folderPath: target.folderPath,
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6
    })
  }

  return (
    <Stack spacing={1.25} sx={tab === 'assets' ? { flex: 1, minHeight: 0 } : undefined}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0.75}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ pt: 1.25 }}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color:
                runtimeState === 'connected' ? 'success.main' : 'text.secondary',
              fontWeight: 600
            }}
          >
            {runtimeState
              ? t(`connection.${runtimeState}`)
              : client.enabled
                ? t('options.clients.idle')
                : t('options.clients.off')}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {t('options.clients.backgroundSummary')}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {t('options.clients.backgroundAssetsEnabledCount', {
            enabled: enabledAssetCount,
            total: totalAssetCount
          })}
        </Typography>
      </Stack>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_event, next) => setTab(next)}
          variant="scrollable"
          scrollButtons={false}
        >
          <Tab value="basics" label={t('options.clients.tab.basics')} />
          <Tab value="assets" label={t('options.clients.tab.assets')} />
          <Tab value="activity" label={t('options.clients.tab.activity')} />
        </Tabs>
      </Box>

      {tab === 'basics' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1.25
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={client.enabled}
                disabled={isRequiredClient}
                onChange={(_, checked) =>
                  updateClient({ ...client, enabled: checked })
                }
              />
            }
            label={t('common.enabled')}
          />
          <TextField
            size="small"
            label={t('options.clients.type')}
            value={t('options.clients.type.background')}
            disabled
          />
          <IconPicker
            label={t('common.icon')}
            value={client.icon}
            onChange={(icon) => updateClient({ ...client, icon })}
          />
          <TextField
            size="small"
            label={t('common.clientName')}
            value={client.clientName}
            onChange={(event) =>
              updateClient({ ...client, clientName: event.target.value })
            }
          />
          <TextField
            size="small"
            label={t('common.clientId')}
            value={client.clientId}
            disabled={isRequiredClient}
            onChange={(event) =>
              updateClient({ ...client, clientId: event.target.value })
            }
          />
          <TextField
            size="small"
            label={t('common.description')}
            value={client.clientDescription}
            onChange={(event) =>
              updateClient({ ...client, clientDescription: event.target.value })
            }
            multiline
            minRows={3}
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
      ) : null}

      {tab === 'assets' ? (
        <Stack spacing={1} sx={{ flex: 1, minHeight: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {t('options.clients.backgroundAssetsDescription')}
          </Typography>

          <Box
            ref={layoutRef}
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: `${treeWidth}px 6px minmax(0, 1fr)`,
              gridTemplateRows: 'minmax(0, 1fr)',
              alignItems: 'stretch'
            }}
          >
            <Box sx={{ minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
              <Stack spacing={0} sx={{ height: '100%', minHeight: 0, flex: 1 }}>
                <Box
                  sx={{
                    pl: 0,
                    pr: 1,
                    py: 0.75,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <TextField
                    inputRef={searchInputRef}
                    size="small"
                    placeholder={t('options.assets.search')}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape' && searchQuery) {
                        event.preventDefault()
                        setSearchQuery('')
                        return
                      }

                      if (
                        firstSearchResultItemId &&
                        (event.key === 'ArrowDown' || event.key === 'Enter')
                      ) {
                        event.preventDefault()
                        setSelectedItemId(firstSearchResultItemId)
                      }
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchOutlined fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: searchQuery ? (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={t('common.clear')}
                              size="small"
                              onClick={() => setSearchQuery('')}
                            >
                              <CloseOutlined fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : undefined
                      }
                    }}
                    sx={{
                      width: '100%',
                      '& .MuiOutlinedInput-root': {
                        minHeight: 34
                      },
                      '& .MuiOutlinedInput-input': {
                        py: 0.75
                      }
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    py: 0.5,
                    pr: 1,
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden'
                  }}
                  onContextMenu={(event) =>
                    openContextMenu(event, {
                      kind: 'root',
                      itemId: 'root'
                    })
                  }
                >
                  {searchQuery.trim() && !hasSearchResults ? (
                    <AssetEmptyState
                      label={t('options.assets.searchEmpty')}
                      minHeight={200}
                    />
                  ) : (
                    <SimpleTreeView
                      expandedItems={expandedItems}
                      expansionTrigger="iconContainer"
                      onExpandedItemsChange={(_event, itemIds) => {
                        const nextItemIds = itemIds as string[]
                        const collapsedSelectionTarget = getCollapsedBackgroundSelectionTarget(
                          expandedItems,
                          nextItemIds,
                          selectedItemId,
                          selectedAsset?.path,
                          selectedFolderPath,
                          sharedDisplayPrefix
                        )

                        if (collapsedSelectionTarget) {
                          setSelectedItemId(collapsedSelectionTarget)
                        }

                        handleBackgroundExpandedItemsChange(
                          nextItemIds,
                          setExpandedFolders
                        )
                      }}
                      onSelectedItemsChange={(_event, itemId) => {
                        const nextItemId = (itemId as string | null) ?? 'root'
                        setSelectedItemId(nextItemId)
                        const nextAssetId =
                          getSelectedBackgroundAssetId(nextItemId)

                        if (nextAssetId) {
                          setDisplayedAssetId(nextAssetId)
                        }
                      }}
                      selectedItems={selectedTreeItemId}
                      sx={assetTreeSx}
                    >
                      {filteredBackgroundTree.map((node) => (
                        <BackgroundAssetTreeNodeItem
                          key={node.id}
                          node={node}
                          onOpenContextMenu={openContextMenu}
                          prefix="asset"
                          renameError={renameError}
                          renameTarget={renameTarget}
                          searchTerm={searchTerm}
                          setExpandedFolders={setExpandedFolders}
                          setSelectedItemId={setSelectedItemId}
                          onCancelRename={() => setRenameTarget(undefined)}
                          onCommitRename={() =>
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
                          onRenameChange={(value) =>
                            setRenameTarget((current) =>
                              current ? { ...current, value } : current
                            )
                          }
                          onStartRename={(target, itemId) => {
                            setRenameTarget(target)
                            setSelectedItemId(itemId)
                          }}
                        />
                      ))}
                    </SimpleTreeView>
                  )}
                </Box>
              </Stack>
            </Box>

            <Box
              aria-hidden
              onDoubleClick={() => setTreeWidth(272)}
              onMouseDown={(event) => {
                event.preventDefault()
                setIsResizingTree(true)
              }}
              sx={{
                cursor: 'col-resize',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '50%',
                  width: 1,
                  transform: 'translateX(-50%)',
                  bgcolor: isResizingTree ? 'text.primary' : 'divider'
                },
                '&:hover::before': {
                  bgcolor: 'text.primary'
                }
              }}
            />

            <Box
              sx={{
                minWidth: 0,
                minHeight: 0,
                pl: 1.5,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {selectedAsset ? (
                <BackgroundExposeDetailPanel
                  asset={selectedAsset}
                  onUpdate={updateExpose}
                />
              ) : (
                <AssetEmptyState
                  label={t('options.assets.searchEmpty')}
                  minHeight={220}
                />
              )}
            </Box>
          </Box>
        </Stack>
      ) : null}

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

      {tab === 'activity' ? (
        <ClientInvocationPanel
          description={t('options.clients.invocations.description')}
          onClearHistory={onClearHistory}
          stats={invocationStats}
        />
      ) : null}
    </Stack>
  )
}

function BackgroundExposeDetailPanel({
  asset,
  onUpdate
}: {
  asset: BackgroundExposeAsset
  onUpdate: (
    id: BackgroundExposeAsset['id'],
    updater: (asset: BackgroundExposeAsset) => BackgroundExposeAsset
  ) => void
}) {
  const { t } = useI18n()
  const definition = getBackgroundExposeDefinition(asset.id)

  return (
    <ScriptedAssetEditorPanel
      controls={
        <FormControlLabel
          control={
            <Switch
              checked={asset.enabled}
              onChange={(_, checked) =>
                onUpdate(asset.id, (current) => ({
                  ...current,
                  enabled: checked
                }))
              }
            />
          }
          label={t('common.enabled')}
        />
      }
      descriptionLabel={t('common.description')}
      descriptionValue={asset.description}
      editorLabel={
        definition?.sourceKind === 'markdown'
          ? t('options.assets.skills.markdown')
          : t('options.clients.defaultPathScript')
      }
      editorLanguage={
        definition?.sourceKind === 'markdown' ? 'markdown' : 'javascript'
      }
      editorModelUri={`inmemory://background-exposes/${asset.id}.${definition?.sourceKind === 'markdown' ? 'md' : 'js'}`}
      editorValue={asset.source}
      onDescriptionChange={(description) =>
        onUpdate(asset.id, (current) => ({
          ...current,
          description
        }))
      }
      onEditorChange={(source) =>
        onUpdate(asset.id, (current) => ({
          ...current,
          source
        }))
      }
    />
  )
}

function BackgroundAssetTreeNodeItem({
  node,
  onOpenContextMenu,
  prefix,
  renameError,
  renameTarget,
  searchTerm,
  setExpandedFolders,
  setSelectedItemId,
  onCancelRename,
  onCommitRename,
  onRenameChange,
  onStartRename
}: {
  node: AssetFileTreeNode
  onOpenContextMenu: (
    event: ReactMouseEvent,
    target: {
      kind: 'asset' | 'folder' | 'root'
      assetId?: BackgroundExposeAsset['id']
      folderPath?: string
      itemId?: string
    }
  ) => void
  prefix: BackgroundTreePrefix
  renameError: boolean
  renameTarget: BackgroundRenameTarget | undefined
  searchTerm?: string
  setExpandedFolders: (updater: (paths: string[]) => string[]) => void
  setSelectedItemId: (itemId: string) => void
  onCancelRename: () => void
  onCommitRename: () => void
  onRenameChange: (value: string) => void
  onStartRename: (target: BackgroundRenameTarget, itemId: string) => void
}) {
  const { t } = useI18n()

  if (node.kind === 'folder') {
    const itemId = `${prefix}-folder:${node.path}`

    return (
      <TreeItem
        itemId={itemId}
        label={
          <AssetTreeLeaf
            onClick={(event) =>
              handleBackgroundExpandableItemClick(
                event,
                itemId,
                setSelectedItemId,
                setExpandedFolders
              )
            }
            action={
                <AssetTreeAction
                  label={t('options.assets.renameItem')}
                  onClick={() =>
                    onStartRename(
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
            icon={<FolderOutlined fontSize="small" />}
            label={
              renameTarget?.kind === 'folder' && renameTarget.path === node.path ? (
                <AssetTreeRenameField
                  error={renameError}
                  onCancel={onCancelRename}
                  onChange={onRenameChange}
                  onCommit={onCommitRename}
                  value={renameTarget.value}
                />
              ) : (
                <Typography variant="body2" noWrap>
                  {renderHighlightedText(node.label, searchTerm)}
                </Typography>
              )
            }
          />
        }
        onContextMenu={(event) =>
          onOpenContextMenu(event, {
            kind: 'folder',
            folderPath: node.path,
            itemId
          })
        }
        onDoubleClick={() =>
          onStartRename(
            {
              kind: 'folder',
              path: node.path,
              value: node.label
            },
            itemId
          )
        }
      >
        {node.children.map((child) => (
          <BackgroundAssetTreeNodeItem
            key={child.id}
            node={child}
            onOpenContextMenu={onOpenContextMenu}
            prefix={prefix}
            renameError={renameError}
            renameTarget={renameTarget}
            searchTerm={searchTerm}
            setExpandedFolders={setExpandedFolders}
            setSelectedItemId={setSelectedItemId}
            onCancelRename={onCancelRename}
            onCommitRename={onCommitRename}
            onRenameChange={onRenameChange}
            onStartRename={onStartRename}
          />
        ))}
      </TreeItem>
    )
  }

  const definition = getBackgroundExposeDefinition(
    node.assetId as BackgroundExposeAsset['id']
  )
  const itemId = `${prefix}:${node.assetId}`

  return (
    <TreeItem
      itemId={itemId}
      label={
        <AssetTreeLeaf
          action={
            <AssetTreeAction
              label={t('options.assets.renameItem')}
              onClick={() =>
                onStartRename(
                  {
                    kind: 'asset',
                    assetId: node.assetId as BackgroundExposeAsset['id'],
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
          icon={<BackgroundMethodBadge definition={definition} />}
          label={
            renameTarget?.kind === 'asset' &&
            renameTarget.assetId === node.assetId ? (
              <AssetTreeRenameField
                error={renameError}
                onCancel={onCancelRename}
                onChange={onRenameChange}
                onCommit={onCommitRename}
                value={renameTarget.value}
              />
            ) : (
              <Typography variant="body2" noWrap>
                {renderHighlightedText(node.label, searchTerm)}
              </Typography>
            )
          }
          onClick={() => setSelectedItemId(itemId)}
        />
      }
      onContextMenu={(event) =>
        onOpenContextMenu(event, {
          kind: 'asset',
          assetId: node.assetId as BackgroundExposeAsset['id'],
          folderPath: dirname(node.path),
          itemId
        })
      }
      onDoubleClick={() =>
        onStartRename(
          {
            kind: 'asset',
            assetId: node.assetId as BackgroundExposeAsset['id'],
            path: node.path,
            value: node.label
          },
          itemId
        )
      }
    />
  )
}

function BackgroundMethodBadge({
  definition
}: {
  definition:
    | ReturnType<typeof getBackgroundExposeDefinition>
    | undefined
}) {
  return <HttpMethodBadge method={definition?.method} />
}

function buildBackgroundTree(
  exposes: BackgroundExposeAsset[],
  sharedDisplayPrefix: string | undefined
): AssetFileTreeNode[] {
  return buildAssetFileTree(
    exposes.map((asset) => ({
      ...asset,
      path: getBackgroundDisplayPath(asset.path, sharedDisplayPrefix),
      name: getBackgroundDisplayPath(asset.path, sharedDisplayPrefix)
    })),
    (asset) => {
      const definition = getBackgroundExposeDefinition(asset.id)
      return [
        asset.path,
        asset.description,
        definition?.method,
        definition?.sourceKind,
        definition?.group
      ]
        .filter(Boolean)
        .join(' ')
    }
  )
}

function getPreferredBackgroundAssetId(
  exposes: BackgroundExposeAsset[]
): BackgroundExposeAsset['id'] | undefined {
  return (
    exposes.find((asset) => asset.path.endsWith('/SKILL.md'))?.id ??
    exposes.find((asset) => asset.path.endsWith('SKILL.md'))?.id ??
    exposes[0]?.id
  )
}

function resolveInitialBackgroundAssetId(
  exposes: BackgroundExposeAsset[],
  initialAssetPath: string | undefined
): BackgroundExposeAsset['id'] | undefined {
  if (initialAssetPath) {
    const matchedAsset = exposes.find((asset) => asset.path === initialAssetPath)

    if (matchedAsset) {
      return matchedAsset.id
    }
  }

  return getPreferredBackgroundAssetId(exposes)
}

function buildBackgroundContextMenuSections(options: {
  contextAsset: BackgroundExposeAsset | undefined
  contextMenu: BackgroundContextMenuState
  expandedFolders: string[]
  sharedDisplayPrefix: string | undefined
  t: (key: string) => string
  copyPath: (path: string) => void
  collapseAllFolders: () => void
  expandAllFolders: () => void
  startRename: (
    target: BackgroundRenameTarget,
    itemId: string
  ) => void
  toggleFolder: (folderPath: string) => void
}): ScriptedAssetContextMenuSection[] {
  const { contextAsset, contextMenu, expandedFolders, sharedDisplayPrefix, t } = options

  if (contextMenu.kind === 'root') {
    return [
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

  if (contextMenu.kind === 'folder' && contextMenu.folderPath) {
    const isExpanded = expandedFolders.includes(contextMenu.folderPath)
    return [
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
            onSelect: () => options.toggleFolder(contextMenu.folderPath!)
          },
          {
            key: 'rename',
            label: t('options.assets.renameItem'),
            icon: <EditOutlined fontSize="small" />,
            onSelect: () =>
              options.startRename(
                {
                  kind: 'folder',
                  path: contextMenu.folderPath!,
                  value: basename(contextMenu.folderPath!)
                },
                `asset-folder:${contextMenu.folderPath}`
              )
          },
          {
            key: 'copy-path',
            label: t('options.assets.menu.copyPath'),
            icon: <ContentCopyOutlined fontSize="small" />,
            onSelect: () => options.copyPath(contextMenu.folderPath!)
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
          disabled: !contextAsset,
          onSelect: () =>
            contextAsset
              ? options.startRename(
                  {
                    kind: 'asset',
                    assetId: contextAsset.id,
                    path: getBackgroundDisplayPath(
                      contextAsset.path,
                      sharedDisplayPrefix
                    ),
                    value: basename(
                      getBackgroundDisplayPath(
                        contextAsset.path,
                        sharedDisplayPrefix
                      )
                    )
                  },
                  `asset:${contextAsset.id}`
                )
              : undefined
        },
        {
          key: 'copy-path',
          label: t('options.assets.menu.copyPath'),
          icon: <ContentCopyOutlined fontSize="small" />,
          disabled: !contextAsset,
          onSelect: () =>
            contextAsset
              ? options.copyPath(
                  getBackgroundDisplayPath(contextAsset.path, sharedDisplayPrefix)
                )
              : undefined
        }
      ]
    }
  ]
}

function handleBackgroundExpandedItemsChange(
  itemIds: string[],
  setExpandedFolders: (paths: string[]) => void
) {
  setExpandedFolders(
    itemIds
      .filter((itemId) => itemId.startsWith('asset-folder:'))
      .map((itemId) => itemId.slice('asset-folder:'.length))
  )
}

function handleBackgroundExpandableItemClick(
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

function getCollapsedBackgroundSelectionTarget(
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

function getSelectedBackgroundAssetId(itemId: string) {
  if (itemId.startsWith('asset:')) {
    return itemId.slice('asset:'.length) as BackgroundExposeAsset['id']
  }

  return undefined
}

function getSelectedBackgroundFolderPath(itemId: string) {
  if (itemId.startsWith('asset-folder:')) {
    return itemId.slice('asset-folder:'.length)
  }

  return undefined
}

function commitBackgroundRename(
  client: BackgroundClientConfig,
  renameTarget: BackgroundRenameTarget | undefined,
  renameError: boolean,
  sharedDisplayPrefix: string | undefined,
  setRenameTarget: (target: BackgroundRenameTarget | undefined) => void,
  setSelectedItemId: (itemId: string) => void,
  updateClient: (next: BackgroundClientConfig) => void
) {
  if (!renameTarget || renameError) {
    return
  }

  if (renameTarget.kind === 'asset') {
    const nextLeaf = normalizeBackgroundTreeLeaf(renameTarget.value)

    if (!nextLeaf) {
      return
    }

    const nextPath = replaceBackgroundPathLeaf(renameTarget.path, nextLeaf)
    const exposes = client.exposes.map((asset) =>
      asset.id === renameTarget.assetId
        ? {
            ...asset,
            path: restoreBackgroundTreePath(nextPath, sharedDisplayPrefix)
          }
        : asset
    )

    updateClient({
      ...client,
      exposes,
      disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
    })
    setSelectedItemId(`asset:${renameTarget.assetId}`)
    setRenameTarget(undefined)
    return
  }

  const nextLeaf = normalizeBackgroundTreeLeaf(renameTarget.value)

  if (!nextLeaf) {
    return
  }

  const nextFolderPath = replaceTreeFolderLeaf(renameTarget.path, nextLeaf)
  const exposes = client.exposes.map((asset) => {
    const normalizedAssetPath = stripLeadingSlash(normalizeBackgroundPath(asset.path))

    if (!normalizedAssetPath.startsWith(`${renameTarget.path}/`)) {
      return asset
    }

    return {
      ...asset,
      path: `/${nextFolderPath}/${normalizedAssetPath.slice(renameTarget.path.length + 1)}`
    }
  })

  updateClient({
    ...client,
    exposes,
    disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
  })
  setSelectedItemId(`asset-folder:${nextFolderPath}`)
  setRenameTarget(undefined)
}

function getBackgroundRenameError(
  target: BackgroundRenameTarget | undefined,
  client: BackgroundClientConfig,
  sharedDisplayPrefix?: string
): boolean {
  if (!target) {
    return false
  }

  if (target.kind === 'asset') {
    const nextLeaf = normalizeBackgroundTreeLeaf(target.value)

    if (!nextLeaf) {
      return true
    }

    return pathExistsInBackgroundExposes(
      client.exposes,
      restoreBackgroundTreePath(
        replaceBackgroundPathLeaf(target.path, nextLeaf),
        sharedDisplayPrefix
      ),
      target.assetId
    )
  }

  const nextLeaf = normalizeBackgroundTreeLeaf(target.value)

  if (!nextLeaf) {
    return true
  }

  const nextFolderPath = replaceTreeFolderLeaf(target.path, nextLeaf)
  const actualTargetFolderPath = stripLeadingSlash(
    restoreBackgroundTreePath(target.path, sharedDisplayPrefix)
  )
  const actualNextFolderPath = stripLeadingSlash(
    restoreBackgroundTreePath(nextFolderPath, sharedDisplayPrefix)
  )
  const affected = client.exposes.filter(
    (asset) =>
      stripLeadingSlash(normalizeBackgroundPath(asset.path)).startsWith(
        `${actualTargetFolderPath}/`
      )
  )
  const unaffected = client.exposes.filter((asset) => !affected.includes(asset))
  const nextPaths = affected.map((asset) =>
    `/${actualNextFolderPath}/${stripLeadingSlash(normalizeBackgroundPath(asset.path)).slice(actualTargetFolderPath.length + 1)}`
  )
  const existing = new Set(unaffected.map((asset) => normalizeBackgroundPath(asset.path)))

  if (nextPaths.some((path) => existing.has(normalizeBackgroundPath(path)))) {
    return true
  }

  return new Set(nextPaths.map((path) => normalizeBackgroundPath(path))).size !== nextPaths.length
}

function pathExistsInBackgroundExposes(
  exposes: BackgroundExposeAsset[],
  nextPath: string,
  currentId?: BackgroundExposeAsset['id']
): boolean {
  const normalized = normalizeBackgroundPath(nextPath)

  return exposes.some(
    (asset) =>
      asset.id !== currentId &&
      normalizeBackgroundPath(asset.path) === normalized
  )
}

function replaceBackgroundPathLeaf(path: string, nextLeaf: string): string {
  const segments = splitBackgroundPath(path)
  const nextSegments = [...segments.slice(0, -1), nextLeaf]
  return `/${nextSegments.join('/')}`
}

function getSharedBackgroundDisplayPrefix(
  exposes: BackgroundExposeAsset[]
): string | undefined {
  const firstSegments = new Set(
    exposes
      .map((asset) => splitBackgroundPath(asset.path)[0])
      .filter(Boolean)
  )

  if (firstSegments.size !== 1) {
    return undefined
  }

  return firstSegments.values().next().value
}

function getBackgroundDisplayPath(
  path: string,
  sharedDisplayPrefix: string | undefined
): string {
  const normalized = normalizeBackgroundPath(path)

  if (!sharedDisplayPrefix) {
    return normalized
  }

  const prefix = `/${sharedDisplayPrefix}`

  if (normalized === prefix) {
    return '/'
  }

  if (normalized.startsWith(`${prefix}/`)) {
    return normalized.slice(prefix.length)
  }

  return normalized
}

function restoreBackgroundTreePath(
  path: string,
  sharedDisplayPrefix: string | undefined
): string {
  const normalized = normalizeBackgroundPath(path)

  if (!sharedDisplayPrefix) {
    return normalized
  }

  if (normalized === '/') {
    return `/${sharedDisplayPrefix}`
  }

  return `/${sharedDisplayPrefix}${normalized}`
}

function replaceTreeFolderLeaf(path: string, nextLeaf: string): string {
  const segments = splitBackgroundPath(path)
  return [...segments.slice(0, -1), nextLeaf].join('/')
}

function normalizeBackgroundTreeLeaf(value: string): string {
  return splitBackgroundPath(value).at(-1) ?? ''
}

function normalizeBackgroundPath(path: string): string {
  const segments = splitBackgroundPath(path)
  return segments.length > 0 ? `/${segments.join('/')}` : '/'
}

function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '')
}

function splitBackgroundPath(path: string): string[] {
  return path
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
    )
    .filter(Boolean)
}

import CloseOutlined from '@mui/icons-material/CloseOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
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
import { alpha, useTheme } from '@mui/material/styles'
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
import { MonacoCodeEditor } from '../../../foundation/monaco-editor.js'
import { useI18n } from '../../../i18n/provider.js'
import { IconPicker } from '../icon-picker.js'
import type { ClientDetailTab } from '../types.js'
import {
  AssetEmptyState,
  AssetScopePanel,
  AssetTreeAction,
  AssetTreeLabel,
  AssetTreeLeaf,
  AssetTreeRenameField,
  basename,
  buildAssetBreadcrumbs,
  buildAssetFileTree,
  collectAssetFolderPaths,
  collectAssetItemIds,
  countAssetFiles,
  filterAssetFileTree,
  findFirstAssetTreeItemId,
  getAssetFolderChildren,
  getParentScopeItemId,
  listAncestorFolders,
  renderHighlightedText,
  type AssetFileTreeNode,
  type AssetScopeEntry
} from './asset-tree-shared.js'
import { ClientInvocationPanel } from './invocation-insights.js'

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

const BACKGROUND_ASSET_TREE_WIDTH_STORAGE_KEY =
  'mdp-options-background-asset-tree-width'

export function BackgroundClientEditor({
  client,
  draft,
  initialTab,
  invocationStats,
  onClearHistory,
  runtimeState,
  onChange
}: {
  client: BackgroundClientConfig
  draft: ExtensionConfig
  initialTab: ClientDetailTab | undefined
  invocationStats: PopupState['clients'][number]['invocationStats'] | undefined
  onClearHistory: () => void
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
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [renameTarget, setRenameTarget] = useState<BackgroundRenameTarget>()
  const [searchQuery, setSearchQuery] = useState('')
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
  const selectedAssetId = getSelectedBackgroundAssetId(selectedItemId)
  const selectedAsset = selectedAssetId
    ? exposesById.get(selectedAssetId)
    : undefined
  const selectedFolderPath = getSelectedBackgroundFolderPath(selectedItemId)
  const renameError = useMemo(
    () => getBackgroundRenameError(renameTarget, client, sharedDisplayPrefix),
    [client, renameTarget, sharedDisplayPrefix]
  )

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
    if (!selectedAssetId || exposesById.has(selectedAssetId)) {
      return
    }

    setSelectedItemId(
      allExposes[0]
        ? `asset:${allExposes[0].id}`
        : 'root'
    )
  }, [allExposes, exposesById, selectedAssetId])

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

  const selectedScopeNodes = getAssetFolderChildren(
    filteredBackgroundTree,
    selectedFolderPath
  )
  const selectedScopeEntries = useMemo(
    () =>
      buildBackgroundScopeEntries(
        'asset',
        selectedScopeNodes,
        exposesById,
        t
      ),
    [exposesById, selectedScopeNodes, t]
  )
  const selectedScopeTitle = selectedFolderPath
    ? basename(selectedFolderPath)
    : t('options.clients.tab.assets')
  const selectedScopeParentItemId = getParentScopeItemId({
    folderItemPrefix: 'asset-folder',
    path: selectedFolderPath,
    rootItemId: 'root'
  })
  const selectedScopeBreadcrumbs = buildAssetBreadcrumbs({
    folderItemPrefix: 'asset-folder',
    path: selectedFolderPath,
    rootItemId: 'root',
    rootLabel: t('options.clients.tab.assets')
  })
  const selectedScopeEmptyLabel = searchTerm
    ? t('options.assets.searchEmpty')
    : t('options.clients.backgroundAssetsDescription')
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
                      onSelectedItemsChange={(_event, itemId) =>
                        setSelectedItemId((itemId as string | null) ?? 'root')
                      }
                      selectedItems={selectedTreeItemId}
                      sx={assetTreeSx}
                    >
                      {filteredBackgroundTree.map((node) => (
                        <BackgroundAssetTreeNodeItem
                          key={node.id}
                          node={node}
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
                <AssetScopePanel
                  breadcrumbs={selectedScopeBreadcrumbs}
                  emptyLabel={selectedScopeEmptyLabel}
                  entries={selectedScopeEntries}
                  hideContextHeader
                  hideParentEntry
                  onOpenItem={setSelectedItemId}
                  openParentLabel={t('options.assets.openParentFolder')}
                  parentItemId={selectedScopeParentItemId}
                  path={selectedFolderPath}
                  searchTerm={searchTerm}
                  title={selectedScopeTitle}
                />
              )}
            </Box>
          </Box>
        </Stack>
      ) : null}

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
    <Stack spacing={1.25} sx={{ minHeight: 0, flex: 1 }}>
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

      <TextField
        size="small"
        label={t('common.description')}
        value={asset.description}
        onChange={(event) =>
          onUpdate(asset.id, (current) => ({
            ...current,
            description: event.target.value
          }))
        }
        multiline
        minRows={2}
      />

      <Typography variant="caption" color="text.secondary">
        {definition?.sourceKind === 'markdown'
          ? t('options.assets.skills.markdown')
          : t('options.clients.defaultPathScript')}
      </Typography>

      <Box
        sx={{
          minHeight: 0,
          flex: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <MonacoCodeEditor
          ariaLabel={
            definition?.sourceKind === 'markdown'
              ? t('options.assets.skills.markdown')
              : t('options.clients.defaultPathScript')
          }
          language={
            definition?.sourceKind === 'markdown' ? 'markdown' : 'javascript'
          }
          minHeight={360}
          modelUri={`inmemory://background-exposes/${asset.id}.${definition?.sourceKind === 'markdown' ? 'md' : 'js'}`}
          onChange={(nextValue) =>
            onUpdate(asset.id, (current) => ({
              ...current,
              source: nextValue
            }))
          }
          value={asset.source}
        />
      </Box>
    </Stack>
  )
}

function BackgroundAssetTreeNodeItem({
  node,
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
            onClick={(event) =>
              handleBackgroundExpandableItemClick(
                event,
                itemId,
                setSelectedItemId,
                setExpandedFolders
              )
            }
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
      >
        {node.children.map((child) => (
          <BackgroundAssetTreeNodeItem
            key={child.id}
            node={child}
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
        />
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
  const label = definition?.method?.slice(0, 1).toUpperCase() ?? 'M'
  const { accent, background } = useBackgroundMethodBadgeTone(definition?.method)

  return (
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: 0.75,
        border: '1px solid',
        borderColor: alpha(accent, 0.4),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        color: accent,
        bgcolor: background,
        flexShrink: 0
      }}
    >
      {label}
    </Box>
  )
}

function useBackgroundMethodBadgeTone(method: string | undefined) {
  const theme = useTheme()

  switch (method) {
    case 'GET':
      return {
        accent: theme.palette.success.main,
        background: alpha(theme.palette.success.main, 0.14)
      }
    case 'POST':
      return {
        accent: theme.palette.warning.dark,
        background: alpha(theme.palette.warning.main, 0.18)
      }
    case 'PUT':
      return {
        accent: theme.palette.info.main,
        background: alpha(theme.palette.info.main, 0.16)
      }
    case 'PATCH':
      return {
        accent: theme.palette.primary.main,
        background: alpha(theme.palette.primary.main, 0.14)
      }
    case 'DELETE':
      return {
        accent: theme.palette.error.main,
        background: alpha(theme.palette.error.main, 0.14)
      }
    default:
      return {
        accent: theme.palette.text.secondary,
        background: alpha(theme.palette.text.secondary, 0.12)
      }
  }
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

function buildBackgroundScopeEntries(
  prefix: BackgroundTreePrefix,
  nodes: AssetFileTreeNode[],
  assetsById: Map<BackgroundExposeAsset['id'], BackgroundExposeAsset>,
  t: (key: string, values?: Record<string, string | number>) => string
): AssetScopeEntry[] {
  return nodes.map((node) => {
    if (node.kind === 'folder') {
      return {
        itemId: `${prefix}-folder:${node.path}`,
        kind: 'folder',
        title: node.label,
        subtitle: t('options.assets.scopeChildren', {
          count: countAssetFiles(node.children)
        })
      }
    }

    const asset = assetsById.get(node.assetId as BackgroundExposeAsset['id'])

    return {
      itemId: `${prefix}:${node.assetId}`,
      kind: 'file',
      title: node.label,
      subtitle: [asset?.path, asset?.description].filter(Boolean).join(' · ')
    }
  })
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

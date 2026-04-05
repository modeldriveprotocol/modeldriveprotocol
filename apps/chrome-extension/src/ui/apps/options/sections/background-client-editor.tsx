import CloseOutlined from '@mui/icons-material/CloseOutlined'
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
import { SimpleTreeView } from '@mui/x-tree-view'
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

import {
  countEnabledBackgroundExposes,
  deriveDisabledBackgroundExposePaths,
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
  applyEnabledValue,
  collectFolderAssetIds,
  collectAssetFolderPaths,
  collectAssetItemIds,
  filterAssetFileTree,
  findFirstAssetTreeItemId,
  listAncestorFolders,
  resolveNextEnabledValue,
} from './asset-tree-shared.js'
import { BackgroundExposeDetailPanel } from './background-client-editor/detail-panel.js'
import { buildBackgroundContextMenuSections } from './background-client-editor/context-menu.js'
import { BackgroundAssetTreeNodeItem } from './background-client-editor/tree-item.js'
import {
  buildBackgroundTree,
  commitBackgroundRename,
  getBackgroundDisplayPath,
  getBackgroundRenameError,
  getCollapsedBackgroundSelectionTarget,
  getPreferredBackgroundAssetId,
  getSelectedBackgroundAssetId,
  getSelectedBackgroundFolderPath,
  getSharedBackgroundDisplayPrefix,
  handleBackgroundExpandedItemsChange,
  resolveInitialBackgroundAssetId
} from './background-client-editor/tree-helpers.js'
import type {
  BackgroundContextMenuState,
  BackgroundRenameTarget
} from './background-client-editor/types.js'
import { ClientInvocationPanel } from './invocation-insights.js'
import { ScriptedAssetContextMenu, type ScriptedAssetContextMenuSection } from './scripted-asset-shared.js'
import {
  createAssetTreeSearchActions,
  ScriptedAssetWorkspace,
  sharedAssetTreeSx
} from './scripted-asset-workspace.js'

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
  const initialSelectedAssetId = resolveInitialBackgroundAssetId(
    client.exposes,
    initialAssetPath
  )
  const [tab, setTab] = useState<'basics' | 'assets' | 'activity'>(
    initialTab === 'activity'
      ? 'activity'
      : initialTab === 'assets'
        ? 'assets'
        : 'basics'
  )
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialSelectedAssetId ? `asset:${initialSelectedAssetId}` : 'root'
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
  const onAssetPathChangeRef = useRef(onAssetPathChange)
  const onTabChangeRef = useRef(onTabChange)
  const lastAppliedRouteSelectionKeyRef = useRef<string | undefined>(undefined)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  onAssetPathChangeRef.current = onAssetPathChange
  onTabChangeRef.current = onTabChange

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
    onTabChangeRef.current(tab)
  }, [tab])

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
  const assetEnabled = useMemo(
    () =>
      new Map(client.exposes.map((asset) => [asset.id, asset.enabled])),
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
  const backgroundTreeSearchActions = createAssetTreeSearchActions(
    {
      expandAll: t('options.assets.menu.expandAll'),
      collapseAll: t('options.assets.menu.collapseAll')
    },
    {
      onExpandAll: () => setExpandedFolders(collectAssetFolderPaths(backgroundTree)),
      onCollapseAll: () => setExpandedFolders([])
    }
  )

  useEffect(() => {
    if (!selectedAsset) {
      return
    }

    const displayPath = getBackgroundDisplayPath(
      selectedAsset.path,
      sharedDisplayPrefix
    )
    setExpandedFolders((current) =>
      mergeExpandedFolders(current, listAncestorFolders(displayPath))
    )
  }, [selectedAsset?.path, sharedDisplayPrefix])

  useEffect(() => {
    if (!selectedFolderPath) {
      return
    }

    const nextPaths = [...new Set(listAncestorFolders(selectedFolderPath))]
    setExpandedFolders((current) => mergeExpandedFolders(current, nextPaths))
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

    if (!nextAssetId || displayedAssetId === nextAssetId) {
      return
    }

    setDisplayedAssetId(nextAssetId)
  }, [displayedAssetId, selectedItemId])

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

  const expandedItems = [...new Set([...expandedFolders, ...forcedExpandedFolders])].map(
    (path) => `asset-folder:${path}`
  )

  function updateBackgroundAssetEnabled(
    assetIds: BackgroundExposeAsset['id'][],
    enabled: boolean
  ) {
    if (assetIds.length === 0) {
      return
    }
    const exposes = applyEnabledValue(client.exposes, assetIds, enabled)

    updateClient({
      ...client,
      exposes,
      disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
    })
  }

  function toggleBackgroundAssetEnabled(assetId: BackgroundExposeAsset['id']) {
    const enabled = assetEnabled.get(assetId)

    if (enabled === undefined) {
      return
    }

    updateBackgroundAssetEnabled([assetId], !enabled)
  }

  function toggleBackgroundFolderEnabled(folderPath: string) {
    const assetIds = collectFolderAssetIds(
      client.exposes.map((asset) => ({
        assetId: asset.id,
        path: getBackgroundDisplayPath(asset.path, sharedDisplayPrefix)
      })),
      folderPath
    ) as BackgroundExposeAsset['id'][]

    if (assetIds.length === 0) {
      return
    }

    const shouldEnable = resolveNextEnabledValue(assetIds, assetEnabled)
    updateBackgroundAssetEnabled(assetIds, shouldEnable)
  }

  function openContextMenu(
    event: ReactMouseEvent,
    target: {
      kind: 'asset' | 'folder' | 'root'
      assetId?: BackgroundExposeAsset['id']
      folderPath?: string
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
        <ScriptedAssetWorkspace
          detailPane={
            selectedAsset ? (
              <BackgroundExposeDetailPanel
                asset={selectedAsset}
                onUpdate={updateExpose}
              />
            ) : (
              <AssetEmptyState
                label={t('options.assets.searchEmpty')}
                minHeight={220}
              />
            )
          }
          onRootContextMenu={(event) =>
            openContextMenu(event, {
              kind: 'root'
            })
          }
        onSearchChange={setSearchQuery}
        onSearchKeyDown={(event) => {
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
        searchInputRef={searchInputRef}
        searchPlaceholder={t('options.assets.search')}
        searchQuery={searchQuery}
        searchActions={backgroundTreeSearchActions}
        sx={{ mt: '-1px !important' }}
        storageKey="mdp-options-background-asset-tree-width"
        treePane={
            searchQuery.trim() && !hasSearchResults ? (
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
                sx={sharedAssetTreeSx}
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
                    selectedItemId={selectedItemId}
                    assetEnabled={assetEnabled}
                    setExpandedFolders={setExpandedFolders}
                    setDisplayedAssetId={setDisplayedAssetId}
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
                    onToggleAssetEnabled={toggleBackgroundAssetEnabled}
                    onToggleFolderEnabled={toggleBackgroundFolderEnabled}
                  />
                ))}
              </SimpleTreeView>
            )
          }
        />
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

function mergeExpandedFolders(current: string[], nextPaths: string[]) {
  const merged = [...new Set([...current, ...nextPaths])]

  return merged.length === current.length &&
    merged.every((path, index) => path === current[index])
    ? current
    : merged
}

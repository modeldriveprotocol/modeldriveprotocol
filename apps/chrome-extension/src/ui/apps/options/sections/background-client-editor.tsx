import CloseOutlined from '@mui/icons-material/CloseOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
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
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  countEnabledBackgroundExposes,
  deriveDisabledBackgroundExposePaths,
  getBackgroundExposeDefinition,
  isRequiredBackgroundClientId,
  listConfiguredBackgroundExposes,
  type BackgroundClientConfig,
  type BackgroundExposeAsset,
  type BackgroundExposeGroup,
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
  AssetTreeLabel,
  AssetTreeLeaf,
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

type BackgroundAssetRoot = 'browser' | 'workspace' | 'skills'
type BackgroundTreePrefix = 'browser' | 'workspace' | 'skill'

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
  const [selectedItemId, setSelectedItemId] = useState<string>('root:browser')
  const [expandedBrowserFolders, setExpandedBrowserFolders] = useState<string[]>(
    []
  )
  const [expandedWorkspaceFolders, setExpandedWorkspaceFolders] = useState<
    string[]
  >([])
  const [expandedSkillFolders, setExpandedSkillFolders] = useState<string[]>([])
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

  const browserExposes = listConfiguredBackgroundExposes(client, {
    group: 'browser'
  })
  const workspaceExposes = listConfiguredBackgroundExposes(client, {
    group: 'workspace'
  })
  const skillExposes = listConfiguredBackgroundExposes(client, {
    group: 'skill'
  })
  const enabledExposeCount = countEnabledBackgroundExposes(client, {
    kind: 'endpoint'
  })
  const enabledSkillCount = countEnabledBackgroundExposes(client, {
    kind: 'skill'
  })
  const totalExposeCount = browserExposes.length + workspaceExposes.length
  const isRequiredClient = isRequiredBackgroundClientId(client.id)
  const exposesById = useMemo(
    () => new Map(client.exposes.map((asset) => [asset.id, asset])),
    [client.exposes]
  )
  const browserTree = useMemo(
    () => buildBackgroundTree(browserExposes),
    [browserExposes]
  )
  const workspaceTree = useMemo(
    () => buildBackgroundTree(workspaceExposes),
    [workspaceExposes]
  )
  const skillTree = useMemo(() => buildBackgroundTree(skillExposes), [skillExposes])
  const filteredBrowserTree = useMemo(
    () => filterAssetFileTree(browserTree, searchQuery),
    [browserTree, searchQuery]
  )
  const filteredWorkspaceTree = useMemo(
    () => filterAssetFileTree(workspaceTree, searchQuery),
    [workspaceTree, searchQuery]
  )
  const filteredSkillTree = useMemo(
    () => filterAssetFileTree(skillTree, searchQuery),
    [searchQuery, skillTree]
  )
  const forcedExpandedBrowserFolders = useMemo(
    () => (searchQuery.trim() ? collectAssetFolderPaths(filteredBrowserTree) : []),
    [filteredBrowserTree, searchQuery]
  )
  const forcedExpandedWorkspaceFolders = useMemo(
    () =>
      searchQuery.trim() ? collectAssetFolderPaths(filteredWorkspaceTree) : [],
    [filteredWorkspaceTree, searchQuery]
  )
  const forcedExpandedSkillFolders = useMemo(
    () => (searchQuery.trim() ? collectAssetFolderPaths(filteredSkillTree) : []),
    [filteredSkillTree, searchQuery]
  )
  const visibleItemIds = useMemo(
    () =>
      new Set([
        'root:browser',
        'root:workspace',
        'root:skills',
        ...collectAssetItemIds('browser', filteredBrowserTree),
        ...collectAssetItemIds('workspace', filteredWorkspaceTree),
        ...collectAssetItemIds('skill', filteredSkillTree)
      ]),
    [filteredBrowserTree, filteredSkillTree, filteredWorkspaceTree]
  )
  const hasSearchResults = visibleItemIds.size > 3
  const searchTerm = searchQuery.trim()
  const selectedRoot = getSelectedBackgroundRoot(selectedItemId)
  const selectedTreeItemId = visibleItemIds.has(selectedItemId)
    ? selectedItemId
    : undefined
  const firstSearchResultItemId = useMemo(
    () =>
      searchTerm
        ? getFirstBackgroundSearchResultItemId(
            selectedRoot,
            filteredBrowserTree,
            filteredWorkspaceTree,
            filteredSkillTree
          )
        : undefined,
    [
      filteredBrowserTree,
      filteredSkillTree,
      filteredWorkspaceTree,
      searchTerm,
      selectedRoot
    ]
  )
  const selectedAssetId = getSelectedBackgroundAssetId(selectedItemId)
  const selectedAsset = selectedAssetId
    ? exposesById.get(selectedAssetId)
    : undefined
  const selectedFolderPath = getSelectedBackgroundFolderPath(selectedItemId)

  useEffect(() => {
    if (selectedRoot === 'browser' && selectedAsset) {
      setExpandedBrowserFolders((current) => [
        ...new Set([...current, ...listAncestorFolders(selectedAsset.path)])
      ])
    }

    if (selectedRoot === 'workspace' && selectedAsset) {
      setExpandedWorkspaceFolders((current) => [
        ...new Set([...current, ...listAncestorFolders(selectedAsset.path)])
      ])
    }

    if (selectedRoot === 'skills' && selectedAsset) {
      setExpandedSkillFolders((current) => [
        ...new Set([...current, ...listAncestorFolders(selectedAsset.path)])
      ])
    }
  }, [selectedAsset, selectedRoot])

  useEffect(() => {
    if (!selectedFolderPath) {
      return
    }

    const nextPaths = [
      ...new Set([...listAncestorFolders(selectedFolderPath), selectedFolderPath])
    ]

    if (selectedRoot === 'browser') {
      setExpandedBrowserFolders((current) => [...new Set([...current, ...nextPaths])])
      return
    }

    if (selectedRoot === 'workspace') {
      setExpandedWorkspaceFolders((current) => [
        ...new Set([...current, ...nextPaths])
      ])
      return
    }

    setExpandedSkillFolders((current) => [...new Set([...current, ...nextPaths])])
  }, [selectedFolderPath, selectedRoot])

  useEffect(() => {
    if (selectedAssetId && exposesById.has(selectedAssetId)) {
      return
    }

    const nextAsset =
      selectedRoot === 'workspace'
        ? workspaceExposes[0]
        : selectedRoot === 'skills'
          ? skillExposes[0]
          : browserExposes[0]

    setSelectedItemId(
      nextAsset
        ? `${getTreePrefixForRoot(selectedRoot)}:${nextAsset.id}`
        : `root:${selectedRoot}`
    )
  }, [
    browserExposes,
    exposesById,
    selectedAssetId,
    selectedRoot,
    skillExposes,
    workspaceExposes
  ])

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

    setSelectedItemId(`root:${selectedRoot}`)
  }, [
    firstSearchResultItemId,
    searchTerm,
    selectedItemId,
    selectedRoot,
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

  const expandedItems = [
    'root:browser',
    'root:workspace',
    'root:skills',
    ...[
      ...new Set([...expandedBrowserFolders, ...forcedExpandedBrowserFolders])
    ].map((path) => `browser-folder:${path}`),
    ...[
      ...new Set([
        ...expandedWorkspaceFolders,
        ...forcedExpandedWorkspaceFolders
      ])
    ].map((path) => `workspace-folder:${path}`),
    ...[...new Set([...expandedSkillFolders, ...forcedExpandedSkillFolders])].map(
      (path) => `skill-folder:${path}`
    )
  ]

  const selectedScopeNodes =
    selectedRoot === 'workspace'
      ? getAssetFolderChildren(filteredWorkspaceTree, selectedFolderPath)
      : selectedRoot === 'skills'
        ? getAssetFolderChildren(filteredSkillTree, selectedFolderPath)
        : getAssetFolderChildren(filteredBrowserTree, selectedFolderPath)
  const selectedScopeEntries = useMemo(
    () =>
      buildBackgroundScopeEntries(
        selectedRoot === 'workspace'
          ? 'workspace'
          : selectedRoot === 'skills'
            ? 'skill'
            : 'browser',
        selectedScopeNodes,
        exposesById,
        t
      ),
    [exposesById, selectedRoot, selectedScopeNodes, t]
  )
  const selectedScopeTitle = selectedFolderPath
    ? basename(selectedFolderPath)
    : getBackgroundRootTitle(t, selectedRoot)
  const selectedScopeParentItemId = getParentScopeItemId({
    folderItemPrefix: `${getTreePrefixForRoot(selectedRoot)}-folder`,
    path: selectedFolderPath,
    rootItemId: `root:${selectedRoot}`
  })
  const selectedScopeBreadcrumbs = buildAssetBreadcrumbs({
    folderItemPrefix: `${getTreePrefixForRoot(selectedRoot)}-folder`,
    path: selectedFolderPath,
    rootItemId: `root:${selectedRoot}`,
    rootLabel: getBackgroundRootTitle(t, selectedRoot)
  })
  const selectedScopeEmptyLabel = searchTerm
    ? t('options.assets.searchEmpty')
    : getBackgroundRootDescription(t, selectedRoot)

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
          {[
            t('options.clients.backgroundExposesCount', {
              enabled: enabledExposeCount,
              total: totalExposeCount
            }),
            t('options.clients.backgroundSkillsCount', {
              enabled: enabledSkillCount,
              total: skillExposes.length
            })
          ].join(' · ')}
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
            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
              <Stack spacing={0} sx={{ height: '100%' }}>
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

                <Box sx={{ py: 0.5, pr: 1 }}>
                  {searchQuery.trim() && !hasSearchResults ? (
                    <AssetEmptyState
                      label={t('options.assets.searchEmpty')}
                      minHeight={200}
                    />
                  ) : (
                    <SimpleTreeView
                      expandedItems={expandedItems}
                      expansionTrigger="iconContainer"
                      onExpandedItemsChange={(_event, itemIds) =>
                        handleBackgroundExpandedItemsChange(
                          itemIds as string[],
                          setExpandedBrowserFolders,
                          setExpandedWorkspaceFolders,
                          setExpandedSkillFolders
                        )
                      }
                      onSelectedItemsChange={(_event, itemId) =>
                        setSelectedItemId((itemId as string | null) ?? 'root:browser')
                      }
                      selectedItems={selectedTreeItemId}
                      sx={{
                        px: 0.5,
                        '& .MuiTreeItem-content': {
                          minHeight: 32,
                          pr: 0.5,
                          borderRadius: 1
                        },
                        '& .MuiTreeItem-label': {
                          flex: 1,
                          minWidth: 0
                        }
                      }}
                    >
                      <TreeItem
                        itemId="root:browser"
                        label={
                          <AssetTreeLabel
                            count={countAssetFiles(filteredBrowserTree)}
                            label={t('options.clients.backgroundBrowserExposes')}
                            searchTerm={searchTerm}
                          />
                        }
                      >
                        {filteredBrowserTree.map((node) => (
                          <BackgroundAssetTreeNodeItem
                            key={node.id}
                            node={node}
                            prefix="browser"
                            searchTerm={searchTerm}
                            onSelectItem={setSelectedItemId}
                          />
                        ))}
                      </TreeItem>
                      <TreeItem
                        itemId="root:workspace"
                        label={
                          <AssetTreeLabel
                            count={countAssetFiles(filteredWorkspaceTree)}
                            label={t('options.clients.backgroundWorkspaceExposes')}
                            searchTerm={searchTerm}
                          />
                        }
                      >
                        {filteredWorkspaceTree.map((node) => (
                          <BackgroundAssetTreeNodeItem
                            key={node.id}
                            node={node}
                            prefix="workspace"
                            searchTerm={searchTerm}
                            onSelectItem={setSelectedItemId}
                          />
                        ))}
                      </TreeItem>
                      <TreeItem
                        itemId="root:skills"
                        label={
                          <AssetTreeLabel
                            count={countAssetFiles(filteredSkillTree)}
                            label={t('options.clients.backgroundSkills')}
                            searchTerm={searchTerm}
                          />
                        }
                      >
                        {filteredSkillTree.map((node) => (
                          <BackgroundAssetTreeNodeItem
                            key={node.id}
                            node={node}
                            prefix="skill"
                            searchTerm={searchTerm}
                            onSelectItem={setSelectedItemId}
                          />
                        ))}
                      </TreeItem>
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
      <Stack spacing={0.25}>
        <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
          {definition?.sourceKind === 'markdown'
            ? asset.path
            : `${definition?.method ?? 'GET'} ${asset.path}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {definition?.contentType ?? definition?.sourceKind ?? 'javascript'}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 1
        }}
      >
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
          label={t('common.path')}
          value={asset.path}
          onChange={(event) =>
            onUpdate(asset.id, (current) => ({
              ...current,
              path: event.target.value
            }))
          }
        />
      </Box>

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
  searchTerm,
  onSelectItem
}: {
  node: AssetFileTreeNode
  prefix: BackgroundTreePrefix
  searchTerm?: string
  onSelectItem: (itemId: string) => void
}) {
  if (node.kind === 'folder') {
    return (
      <TreeItem
        itemId={`${prefix}-folder:${node.path}`}
        label={
          <Box onClick={() => onSelectItem(`${prefix}-folder:${node.path}`)}>
            <AssetTreeLeaf
              icon={<FolderOutlined fontSize="small" />}
              label={
                <Typography variant="body2" noWrap>
                  {renderHighlightedText(node.label, searchTerm)}
                </Typography>
              }
            />
          </Box>
        }
      >
        {node.children.map((child) => (
          <BackgroundAssetTreeNodeItem
            key={child.id}
            node={child}
            prefix={prefix}
            searchTerm={searchTerm}
            onSelectItem={onSelectItem}
          />
        ))}
      </TreeItem>
    )
  }

  return (
    <TreeItem
      itemId={`${prefix}:${node.assetId}`}
      label={
        <Box onClick={() => onSelectItem(`${prefix}:${node.assetId}`)}>
          <AssetTreeLeaf
            icon={<DescriptionOutlined fontSize="small" />}
            label={
              <Typography variant="body2" noWrap>
                {renderHighlightedText(node.label, searchTerm)}
              </Typography>
            }
          />
        </Box>
      }
    />
  )
}

function buildBackgroundTree(
  exposes: BackgroundExposeAsset[]
): AssetFileTreeNode[] {
  return buildAssetFileTree(
    exposes.map((asset) => ({
      ...asset,
      name: asset.path
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
  setExpandedBrowserFolders: (paths: string[]) => void,
  setExpandedWorkspaceFolders: (paths: string[]) => void,
  setExpandedSkillFolders: (paths: string[]) => void
) {
  setExpandedBrowserFolders(
    itemIds
      .filter((itemId) => itemId.startsWith('browser-folder:'))
      .map((itemId) => itemId.slice('browser-folder:'.length))
  )
  setExpandedWorkspaceFolders(
    itemIds
      .filter((itemId) => itemId.startsWith('workspace-folder:'))
      .map((itemId) => itemId.slice('workspace-folder:'.length))
  )
  setExpandedSkillFolders(
    itemIds
      .filter((itemId) => itemId.startsWith('skill-folder:'))
      .map((itemId) => itemId.slice('skill-folder:'.length))
  )
}

function getSelectedBackgroundRoot(itemId: string): BackgroundAssetRoot {
  if (itemId.startsWith('root:')) {
    return itemId.slice('root:'.length) as BackgroundAssetRoot
  }

  if (
    itemId.startsWith('workspace:') ||
    itemId.startsWith('workspace-folder:')
  ) {
    return 'workspace'
  }

  if (itemId.startsWith('skill:') || itemId.startsWith('skill-folder:')) {
    return 'skills'
  }

  return 'browser'
}

function getSelectedBackgroundAssetId(itemId: string) {
  if (itemId.startsWith('browser:')) {
    return itemId.slice('browser:'.length) as BackgroundExposeAsset['id']
  }

  if (itemId.startsWith('workspace:')) {
    return itemId.slice('workspace:'.length) as BackgroundExposeAsset['id']
  }

  if (itemId.startsWith('skill:')) {
    return itemId.slice('skill:'.length) as BackgroundExposeAsset['id']
  }

  return undefined
}

function getSelectedBackgroundFolderPath(itemId: string) {
  if (itemId.startsWith('browser-folder:')) {
    return itemId.slice('browser-folder:'.length)
  }

  if (itemId.startsWith('workspace-folder:')) {
    return itemId.slice('workspace-folder:'.length)
  }

  if (itemId.startsWith('skill-folder:')) {
    return itemId.slice('skill-folder:'.length)
  }

  return undefined
}

function getTreePrefixForRoot(root: BackgroundAssetRoot): BackgroundTreePrefix {
  return root === 'skills' ? 'skill' : root
}

function getFirstBackgroundSearchResultItemId(
  selectedRoot: BackgroundAssetRoot,
  browserTree: AssetFileTreeNode[],
  workspaceTree: AssetFileTreeNode[],
  skillTree: AssetFileTreeNode[]
) {
  const candidates =
    selectedRoot === 'workspace'
      ? [
          findFirstAssetTreeItemId('workspace', workspaceTree),
          findFirstAssetTreeItemId('browser', browserTree),
          findFirstAssetTreeItemId('skill', skillTree)
        ]
      : selectedRoot === 'skills'
        ? [
            findFirstAssetTreeItemId('skill', skillTree),
            findFirstAssetTreeItemId('browser', browserTree),
            findFirstAssetTreeItemId('workspace', workspaceTree)
          ]
        : [
            findFirstAssetTreeItemId('browser', browserTree),
            findFirstAssetTreeItemId('workspace', workspaceTree),
            findFirstAssetTreeItemId('skill', skillTree)
          ]

  return candidates.find(Boolean)
}

function getBackgroundRootTitle(
  t: (key: string, values?: Record<string, string | number>) => string,
  root: BackgroundExposeGroup | BackgroundAssetRoot
): string {
  if (root === 'workspace') {
    return t('options.clients.backgroundWorkspaceExposes')
  }

  if (root === 'skill' || root === 'skills') {
    return t('options.clients.backgroundSkills')
  }

  return t('options.clients.backgroundBrowserExposes')
}

function getBackgroundRootDescription(
  t: (key: string, values?: Record<string, string | number>) => string,
  root: BackgroundAssetRoot
): string {
  if (root === 'workspace') {
    return t('options.clients.backgroundWorkspaceDescription')
  }

  if (root === 'skills') {
    return t('options.clients.backgroundSkillsDescription')
  }

  return t('options.clients.backgroundBrowserDescription')
}

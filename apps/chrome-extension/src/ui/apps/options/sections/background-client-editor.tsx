import { Box, Stack, Tab, Tabs, Typography } from '@mui/material'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useMemo } from 'react'

import type {
  BackgroundClientConfig,
  ExtensionConfig
} from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import {
  AssetEmptyState,
  basename,
  collectAssetFolderPaths,
  collectAssetSubtreeItemIds
} from './asset-tree-shared.js'
import { BackgroundClientAssetsTab } from './background-client-editor/assets-tab.js'
import { BackgroundClientBasicsTab } from './background-client-editor/basics-tab.js'
import { buildBackgroundContextMenuSections } from './background-client-editor/context-menu.js'
import { BackgroundExposeDetailPanel } from './background-client-editor/detail-panel.js'
import {
  getBackgroundDisplayPath,
  getBackgroundRenameError
} from './background-client-editor/tree-helpers.js'
import { useBackgroundClientEditorActions } from './background-client-editor/use-background-client-editor-actions.js'
import { useBackgroundClientEditorState } from './background-client-editor/use-background-client-editor-state.js'
import { ClientInvocationPanel } from './invocation-insights.js'
import { createAssetTreeSearchActions } from './scripted-asset-workspace.js'
import {
  ScriptedAssetContextMenu,
  type ScriptedAssetContextMenuSection
} from './scripted-asset-shared.js'
import type { ClientDetailTab } from '../types.js'

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
  const state = useBackgroundClientEditorState({
    client,
    initialAssetPath,
    initialTab:
      initialTab === 'activity'
        ? 'activity'
        : initialTab === 'assets'
          ? 'assets'
          : 'basics',
    onAssetPathChange,
    onTabChange
  })
  const renameError = useMemo(
    () =>
      getBackgroundRenameError(
        state.renameTarget,
        client,
        state.sharedDisplayPrefix
      ),
    [client, state.renameTarget, state.sharedDisplayPrefix]
  )
  const actions = useBackgroundClientEditorActions({
    assetEnabled: state.assetEnabled,
    client,
    draft,
    onChange,
    renameError,
    renameTarget: state.renameTarget,
    selectedItemId: state.selectedItemId,
    selectedItemIds: state.selectedItemIds,
    setContextMenu: state.setContextMenu,
    setDisplayedAssetId: state.setDisplayedAssetId,
    setDragState: state.setDragState,
    setDropTargetItemId: state.setDropTargetItemId,
    setExpandedFolders: state.setExpandedFolders,
    setRenameTarget: state.setRenameTarget,
    setSelectedItemIds: state.setSelectedItemIds,
    setSelectedItemId: state.setSelectedItemId,
    sharedDisplayPrefix: state.sharedDisplayPrefix
  })
  const searchActions = createAssetTreeSearchActions(
    {
      expandAll: t('options.assets.menu.expandAll'),
      collapseAll: t('options.assets.menu.collapseAll')
    },
    {
      onExpandAll: () =>
        state.setExpandedFolders(collectAssetFolderPaths(state.backgroundTree)),
      onCollapseAll: () => state.setExpandedFolders([])
    }
  )
  const contextAsset = state.contextMenu?.assetId
    ? state.exposesById.get(state.contextMenu.assetId)
    : undefined
  const hasSelection = state.selectedItemIds.length > 0
  const selectionIncludesContextTarget = state.contextMenu
    ? state.contextMenu.kind === 'root'
      ? hasSelection
      : state.contextMenu.kind === 'folder'
        ? state.selectedItemIds.includes(
            `asset-folder:${state.contextMenu.folderPath ?? ''}`
          )
        : Boolean(
            state.contextMenu.assetId &&
              state.selectedItemIds.includes(`asset:${state.contextMenu.assetId}`)
          )
    : false

  function clearSelection() {
    state.setSelectedItemIds(
      state.selectedItemId !== 'root' ? [state.selectedItemId] : []
    )
  }

  function selectAllVisibleItems() {
    state.setSelectedItemIds(state.orderedVisibleItemIds)

    if (
      state.selectedItemId === 'root' ||
      !state.orderedVisibleItemIds.includes(state.selectedItemId)
    ) {
      state.setSelectedItemId(state.orderedVisibleItemIds[0] ?? 'root')
    }
  }

  function selectFolderContents(folderPath: string) {
    const nextItemIds = collectAssetSubtreeItemIds(
      'asset',
      state.filteredBackgroundTree,
      folderPath,
      { includeFolder: true }
    )

    if (nextItemIds.length === 0) {
      return
    }

    state.setSelectedItemId(`asset-folder:${folderPath}`)
    state.setSelectedItemIds(nextItemIds)
  }

  function copySelectedPaths() {
    const nextPaths = state.selectedItemIds.flatMap((itemId) => {
      if (itemId.startsWith('asset-folder:')) {
        return [itemId.slice('asset-folder:'.length)]
      }

      if (itemId.startsWith('asset:')) {
        const asset = state.exposesById.get(
          itemId.slice('asset:'.length) as BackgroundClientConfig['exposes'][number]['id']
        )
        return asset
          ? [
              getBackgroundDisplayPath(
                asset.path,
                state.sharedDisplayPrefix
              ).replace(/^\/+/, '') || '/'
            ]
          : []
      }

      return []
    })

    if (nextPaths.length === 0) {
      return
    }

    void navigator.clipboard.writeText([...new Set(nextPaths)].join('\n'))
  }

  function startRenameFromSelection() {
    if (state.selectedItemId.startsWith('asset-folder:')) {
      const folderPath = state.selectedItemId.slice('asset-folder:'.length)
      actions.startRename(
        {
          kind: 'folder',
          path: folderPath,
          value: basename(folderPath)
        },
        state.selectedItemId
      )
      return
    }

    if (!state.selectedItemId.startsWith('asset:')) {
      return
    }

    const assetId = state.selectedItemId.slice('asset:'.length) as BackgroundClientConfig['exposes'][number]['id']
    const asset = state.exposesById.get(assetId)

    if (!asset) {
      return
    }

    actions.startRename(
      {
        kind: 'asset',
        assetId,
        path: getBackgroundDisplayPath(asset.path, state.sharedDisplayPrefix),
        value: basename(
          getBackgroundDisplayPath(asset.path, state.sharedDisplayPrefix)
        )
      },
      state.selectedItemId
    )
  }

  function handleTreeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null

    if (target?.closest('input, textarea, [contenteditable="true"]')) {
      return
    }

    const lowerKey = event.key.toLowerCase()
    const hasModifier = event.metaKey || event.ctrlKey

    if (hasModifier && lowerKey === 'a') {
      event.preventDefault()
      selectAllVisibleItems()
      return
    }

    if (hasModifier && event.shiftKey && lowerKey === 'c') {
      event.preventDefault()
      copySelectedPaths()
      return
    }

    if (event.key === 'Escape') {
      if (state.contextMenu) {
        event.preventDefault()
        state.setContextMenu(undefined)
        return
      }

      if (state.renameTarget) {
        event.preventDefault()
        state.setRenameTarget(undefined)
        return
      }

      if (state.selectedItemIds.length > 1) {
        event.preventDefault()
        clearSelection()
      }

      return
    }

    if (event.key === 'F2') {
      event.preventDefault()
      startRenameFromSelection()
    }
  }

  const contextMenuSections: ScriptedAssetContextMenuSection[] = state.contextMenu
    ? buildBackgroundContextMenuSections({
        clearSelection,
        contextAsset,
        contextMenu: state.contextMenu,
        expandedFolders: state.expandedFolders,
        hasSelection,
        selectionIncludesContextTarget,
        sharedDisplayPrefix: state.sharedDisplayPrefix,
        t,
        collapseAllFolders: () => state.setExpandedFolders([]),
        copyPath: (path) => {
          void navigator.clipboard.writeText(path)
        },
        copySelectedPaths,
        disableSelection: () =>
          actions.setBackgroundSelectionEnabled(state.selectedItemIds, false),
        enableSelection: () =>
          actions.setBackgroundSelectionEnabled(state.selectedItemIds, true),
        expandAllFolders: () =>
          state.setExpandedFolders(collectAssetFolderPaths(state.backgroundTree)),
        selectAllVisibleItems,
        selectFolderContents,
        startRename: actions.startRename,
        toggleFolder: actions.toggleFolder
      })
    : []

  return (
    <Stack spacing={1.25} sx={state.tab === 'assets' ? { flex: 1, minHeight: 0 } : undefined}>
      <BackgroundClientHeader
        clientEnabled={client.enabled}
        enabledAssetCount={state.enabledAssetCount}
        runtimeState={runtimeState}
        t={t}
        totalAssetCount={state.totalAssetCount}
      />

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={state.tab}
          onChange={(_event, next) => state.setTab(next)}
          variant="scrollable"
          scrollButtons={false}
        >
          <Tab value="basics" label={t('options.clients.tab.basics')} />
          <Tab value="assets" label={t('options.clients.tab.assets')} />
          <Tab value="activity" label={t('options.clients.tab.activity')} />
        </Tabs>
      </Box>

      {state.tab === 'basics' ? (
        <BackgroundClientBasicsTab
          client={client}
          disabled={state.isRequiredClient}
          labels={{
            backgroundType: t('options.clients.type.background'),
            clientId: t('common.clientId'),
            clientName: t('common.clientName'),
            description: t('common.description'),
            enabled: t('common.enabled'),
            icon: t('common.icon'),
            type: t('options.clients.type')
          }}
          onChange={actions.updateClient}
        />
      ) : null}

      {state.tab === 'assets' ? (
        <BackgroundClientAssetsTab
          detailPane={
            state.selectedAsset ? (
              <BackgroundExposeDetailPanel
                asset={state.selectedAsset}
                onUpdate={actions.updateExpose}
              />
            ) : (
              <AssetEmptyState label={t('options.assets.searchEmpty')} minHeight={220} />
            )
          }
          dragState={state.dragState}
          emptyLabel={t('options.assets.searchEmpty')}
          expandedItems={state.expandedItems}
          filteredBackgroundTree={state.filteredBackgroundTree}
          hasSearchResults={state.hasSearchResults}
          onCommitRename={actions.commitRename}
          onDropItem={actions.handleDrop}
          onOpenContextMenu={actions.openContextMenu}
          onRenameChange={(value) =>
            state.setRenameTarget((current) =>
              current ? { ...current, value } : current
            )
          }
          onSearchChange={state.setSearchQuery}
          onSearchKeyDown={(event) => {
            if (event.key === 'Escape' && state.searchQuery) {
              event.preventDefault()
              state.setSearchQuery('')
              return
            }

            if (
              state.firstSearchResultItemId &&
              (event.key === 'ArrowDown' || event.key === 'Enter')
            ) {
              event.preventDefault()
              state.setSelectedItemId(state.firstSearchResultItemId)
              state.setSelectedItemIds([state.firstSearchResultItemId])
            }
          }}
          onSelectItem={actions.selectItem}
          onStartRename={actions.startRename}
          onTreeKeyDown={handleTreeKeyDown}
          renameError={renameError}
          renameTarget={state.renameTarget}
          searchActions={searchActions}
          searchInputRef={state.searchInputRef}
          searchPlaceholder={t('options.assets.search')}
          searchQuery={state.searchQuery}
          searchTerm={state.searchTerm}
          selectedAssetPath={state.selectedAsset?.path}
          selectedFolderPath={state.selectedFolderPath}
          selectedItemId={state.selectedItemId}
          selectedItemIds={state.selectedItemIds}
          orderedVisibleItemIds={state.orderedVisibleItemIds}
          onRootDragLeave={() =>
            state.setDropTargetItemId((current) =>
              current === 'root' ? undefined : current
            )
          }
          onRootDrop={(dragState) => actions.handleDrop('', dragState)}
          onSetDropTarget={state.setDropTargetItemId}
          onStartDrag={state.setDragState}
          setExpandedFolders={state.setExpandedFolders}
          setDisplayedAssetId={state.setDisplayedAssetId}
          setRenameTarget={state.setRenameTarget}
          setSelectedItemIds={state.setSelectedItemIds}
          setSelectedItemId={state.setSelectedItemId}
          sharedDisplayPrefix={state.sharedDisplayPrefix}
          toggleBackgroundAssetEnabled={actions.toggleBackgroundAssetEnabled}
          toggleBackgroundFolderEnabled={actions.toggleBackgroundFolderEnabled}
          dropTargetItemId={state.dropTargetItemId}
          treeAssetEnabled={state.assetEnabled}
        />
      ) : null}

      <ScriptedAssetContextMenu
        anchorPosition={
          state.contextMenu
            ? { top: state.contextMenu.mouseY, left: state.contextMenu.mouseX }
            : undefined
        }
        onClose={() => state.setContextMenu(undefined)}
        open={Boolean(state.contextMenu)}
        sections={contextMenuSections}
      />

      {state.tab === 'activity' ? (
        <ClientInvocationPanel
          description={t('options.clients.invocations.description')}
          onClearHistory={onClearHistory}
          stats={invocationStats}
        />
      ) : null}
    </Stack>
  )
}

function BackgroundClientHeader({
  clientEnabled,
  enabledAssetCount,
  runtimeState,
  t,
  totalAssetCount
}: {
  clientEnabled: boolean
  enabledAssetCount: number
  runtimeState: PopupState['clients'][number]['connectionState'] | undefined
  t: ReturnType<typeof useI18n>['t']
  totalAssetCount: number
}) {
  return (
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
            : clientEnabled
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
  )
}

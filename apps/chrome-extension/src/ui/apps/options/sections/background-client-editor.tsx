import { Box, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useMemo } from 'react'

import type {
  BackgroundClientConfig,
  ExtensionConfig
} from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import { AssetEmptyState, collectAssetFolderPaths } from './asset-tree-shared.js'
import { BackgroundClientAssetsTab } from './background-client-editor/assets-tab.js'
import { BackgroundClientBasicsTab } from './background-client-editor/basics-tab.js'
import { buildBackgroundContextMenuSections } from './background-client-editor/context-menu.js'
import { BackgroundExposeDetailPanel } from './background-client-editor/detail-panel.js'
import { getBackgroundRenameError } from './background-client-editor/tree-helpers.js'
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
    setContextMenu: state.setContextMenu,
    setDisplayedAssetId: state.setDisplayedAssetId,
    setExpandedFolders: state.setExpandedFolders,
    setRenameTarget: state.setRenameTarget,
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
  const contextMenuSections: ScriptedAssetContextMenuSection[] = state.contextMenu
    ? buildBackgroundContextMenuSections({
        contextAsset,
        contextMenu: state.contextMenu,
        expandedFolders: state.expandedFolders,
        sharedDisplayPrefix: state.sharedDisplayPrefix,
        t,
        collapseAllFolders: () => state.setExpandedFolders([]),
        copyPath: (path) => {
          void navigator.clipboard.writeText(path)
        },
        expandAllFolders: () =>
          state.setExpandedFolders(collectAssetFolderPaths(state.backgroundTree)),
        startRename: actions.startRename,
        toggleFolder: (folderPath) =>
          state.setExpandedFolders((current) =>
            current.includes(folderPath)
              ? current.filter((path) => path !== folderPath)
              : [...current, folderPath]
          )
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
          emptyLabel={t('options.assets.searchEmpty')}
          expandedItems={state.expandedItems}
          filteredBackgroundTree={state.filteredBackgroundTree}
          firstSearchResultItemId={state.firstSearchResultItemId}
          hasSearchResults={state.hasSearchResults}
          onCommitRename={actions.commitRename}
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
            }
          }}
          onStartRename={actions.startRename}
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
          selectedTreeItemId={state.selectedTreeItemId}
          setDisplayedAssetId={state.setDisplayedAssetId}
          setExpandedFolders={state.setExpandedFolders}
          setRenameTarget={state.setRenameTarget}
          setSelectedItemId={state.setSelectedItemId}
          sharedDisplayPrefix={state.sharedDisplayPrefix}
          toggleBackgroundAssetEnabled={actions.toggleBackgroundAssetEnabled}
          toggleBackgroundFolderEnabled={actions.toggleBackgroundFolderEnabled}
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

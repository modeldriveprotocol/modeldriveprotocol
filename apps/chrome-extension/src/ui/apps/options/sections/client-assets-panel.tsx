import { Stack } from '@mui/material'

import type {
  ExtensionConfig,
  RouteClientConfig
} from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../../platform/extension-api.js'
import { useI18n } from '../../../i18n/provider.js'
import { AssetEmptyState, collectAssetFolderPaths } from './asset-tree-shared.js'
import { buildRouteContextMenuSections } from './client-assets-panel/context-menu.js'
import { RouteCodeEditor, RouteMarkdownEditor } from './client-assets-panel/editors.js'
import { useClientAssetsPanelActions } from './client-assets-panel/use-client-assets-panel-actions.js'
import { useClientAssetsPanelState } from './client-assets-panel/use-client-assets-panel-state.js'
import { ClientAssetsWorkspace } from './client-assets-panel/workspace.js'
import { createAssetTreeSearchActions } from './scripted-asset-workspace.js'

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
  const state = useClientAssetsPanelState({
    client,
    initialPath,
    initialTab,
    onSelectedPathChange
  })
  const actions = useClientAssetsPanelActions({
    assetEnabled: state.assetEnabled,
    client,
    draft,
    fileItems: state.fileItems,
    folderAssets: state.folderAssets,
    onChange,
    renameError: state.renameError,
    renameTarget: state.renameTarget,
    rootSkillId: state.rootSkillId,
    routeTree: state.routeTree,
    setContextMenu: state.setContextMenu,
    setDisplayedFileId: state.setDisplayedFileId,
    setDragState: state.setDragState,
    setDropTargetItemId: state.setDropTargetItemId,
    setExpandedFolders: state.setExpandedFolders,
    setRenameTarget: state.setRenameTarget,
    setSelectedItemId: state.setSelectedItemId,
    t
  })
  const contextAsset = state.contextMenu?.assetId
    ? client.exposes.find((asset) => asset.id === state.contextMenu?.assetId)
    : undefined
  const defaultFolderPath =
    state.selectedFolderPath ??
    (state.displayedAsset?.path
      ? state.displayedAsset.path.split('/').slice(0, -1).join('/')
      : '')
  const contextMenuSections = state.contextMenu
    ? buildRouteContextMenuSections({
        contextMenu: state.contextMenu,
        contextAsset,
        expandedFolders: state.expandedFolders,
        t,
        addCode: (parentPath = defaultFolderPath) => actions.addCode(parentPath),
        addFolder: (parentPath = defaultFolderPath) => actions.addFolder(parentPath),
        addMarkdown: (parentPath = defaultFolderPath) => actions.addMarkdown(parentPath),
        collapseAllFolders: actions.collapseAllFolders,
        copyPath: (path) => {
          void navigator.clipboard.writeText(path)
        },
        deleteTarget: actions.deleteTarget,
        expandAllFolders: actions.expandAllFolders,
        startRename: actions.startRename,
        toggleFolder: actions.toggleFolder
      })
    : []

  return (
    <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0 }}>
      <ClientAssetsWorkspace
        assetEnabled={state.assetEnabled}
        assetKinds={state.assetKinds}
        assetMethods={state.assetMethods}
        contextMenu={state.contextMenu}
        contextMenuSections={contextMenuSections}
        detailPane={
          state.displayedSkill ? (
            <RouteMarkdownEditor
              asset={state.displayedSkill}
              onChange={(nextSkill) =>
                actions.replaceExposeKind(
                  'skill',
                  state.skillEntries.map((item) =>
                    item.id === nextSkill.id ? nextSkill : item
                  )
                )
              }
            />
          ) : state.displayedFlow ? (
            <RouteCodeEditor
              asset={state.displayedFlow}
              onChange={(nextFlow) =>
                actions.replaceExposeKind(
                  'flow',
                  state.recordings.map((item) =>
                    item.id === nextFlow.id ? nextFlow : item
                  )
                )
              }
            />
          ) : state.displayedResource ? (
            <RouteCodeEditor
              asset={state.displayedResource}
              onChange={(nextResource) =>
                actions.replaceExposeKind(
                  'resource',
                  state.selectorResources.map((item) =>
                    item.id === nextResource.id ? nextResource : item
                  )
                )
              }
            />
          ) : (
            <AssetEmptyState label={t('options.assets.skills.noSelection')} minHeight={220} />
          )
        }
        dragState={state.dragState}
        dropTargetItemId={state.dropTargetItemId}
        expandedItems={state.expandedItems}
        filteredTree={state.filteredTree}
        onCloseContextMenu={() => state.setContextMenu(undefined)}
        onCommitRename={actions.commitRename}
        onDropItem={actions.handleDrop}
        onOpenContextMenu={actions.openContextMenu}
        onOpenItem={actions.openItem}
        onRenameChange={(value) =>
          state.setRenameTarget((current) =>
            current ? { ...current, value } : current
          )
        }
        onRootDragLeave={() =>
          state.setDropTargetItemId((current) =>
            current === 'root' ? undefined : current
          )
        }
        onRootDrop={(dragState) => actions.handleDrop('', 'root', dragState)}
        onSearchChange={state.setSearchQuery}
        onSetDropTarget={state.setDropTargetItemId}
        onStartDrag={state.setDragState}
        onStartRename={actions.startRename}
        renameError={state.renameError}
        renameTarget={state.renameTarget}
        searchActions={createAssetTreeSearchActions(
          {
            expandAll: t('options.assets.menu.expandAll'),
            collapseAll: t('options.assets.menu.collapseAll')
          },
          {
            onExpandAll: () =>
              state.setExpandedFolders(collectAssetFolderPaths(state.routeTree)),
            onCollapseAll: actions.collapseAllFolders
          }
        )}
        searchQuery={state.searchQuery}
        selectedItemId={state.selectedItemId}
        setRenameTarget={state.setRenameTarget}
        storageKey="mdp-options-route-asset-tree-width"
        t={t}
        toggleAssetEnabled={actions.toggleAssetEnabled}
        toggleFolderAssetEnabled={actions.toggleFolderAssetEnabled}
      />
    </Stack>
  )
}

import { Stack } from '@mui/material'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

import type {
  ExtensionConfig,
  RouteClientConfig
} from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../../platform/extension-api.js'
import { useI18n } from '../../../i18n/provider.js'
import {
  AssetEmptyState,
  basename,
  collectAssetFolderPaths,
  collectAssetSubtreeItemIds,
  getCollapsedTreeSelectionTarget
} from './asset-tree-shared.js'
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
    selectedItemId: state.selectedItemId,
    selectedItemIds: state.selectedItemIds,
    setContextMenu: state.setContextMenu,
    setDisplayedFileId: state.setDisplayedFileId,
    setDragState: state.setDragState,
    setDropTargetItemId: state.setDropTargetItemId,
    setExpandedFolders: state.setExpandedFolders,
    setRenameTarget: state.setRenameTarget,
    setSelectedItemIds: state.setSelectedItemIds,
    setSelectedItemId: state.setSelectedItemId,
    t
  })
  const contextAsset = state.contextMenu?.assetId
    ? client.exposes.find((asset) => asset.id === state.contextMenu?.assetId)
    : undefined
  const hasSelection = state.selectedItemIds.length > 0
  const selectionIncludesContextTarget = state.contextMenu
    ? state.contextMenu.kind === 'root'
      ? hasSelection
      : state.contextMenu.kind === 'folder'
        ? state.selectedItemIds.includes(
            `route-asset-folder:${state.contextMenu.folderPath}`
          )
        : Boolean(
            state.contextMenu.assetId &&
              state.selectedItemIds.includes(`route-asset:${state.contextMenu.assetId}`)
          )
    : false
  const canDeleteSelection = state.selectedItemIds.some((itemId) => {
    if (!itemId.startsWith('route-asset:')) {
      return itemId.startsWith('route-asset-folder:')
    }

    const asset = state.assetsById.get(itemId.slice('route-asset:'.length))
    return Boolean(asset && asset.kind !== 'skill' || (asset && asset.path !== 'SKILL.md'))
  })
  const defaultFolderPath =
    state.selectedFolderPath ??
    (state.displayedAsset?.path
      ? state.displayedAsset.path.split('/').slice(0, -1).join('/')
      : '')

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
      'route-asset',
      state.filteredTree,
      folderPath,
      { includeFolder: true }
    )

    if (nextItemIds.length === 0) {
      return
    }

    state.setSelectedItemId(`route-asset-folder:${folderPath}`)
    state.setSelectedItemIds(nextItemIds)
  }

  function handleExpandedItemsChange(nextExpandedItemIds: string[]) {
    const collapsedSelectionTarget = getCollapsedTreeSelectionTarget({
      prefix: 'route-asset',
      previousExpandedItemIds: state.expandedItems,
      nextExpandedItemIds,
      selectedItemId: state.selectedItemId,
      selectedAssetPath: state.displayedAsset?.path,
      selectedFolderPath: state.selectedFolderPath
    })

    if (collapsedSelectionTarget) {
      state.setSelectedItemId(collapsedSelectionTarget)
      state.setSelectedItemIds([collapsedSelectionTarget])
    }

    const nextExpandedFolders = nextExpandedItemIds
      .filter((itemId) => itemId.startsWith('route-asset-folder:'))
      .map((itemId) => itemId.slice('route-asset-folder:'.length))
      .sort()

    state.setExpandedFolders((current) => {
      const currentSorted = [...current].sort()

      return currentSorted.length === nextExpandedFolders.length &&
        currentSorted.every((path, index) => path === nextExpandedFolders[index])
        ? current
        : nextExpandedFolders
    })
  }

  function copySelectedPaths() {
    const nextPaths = state.selectedItemIds.flatMap((itemId) => {
      if (itemId.startsWith('route-asset-folder:')) {
        return [itemId.slice('route-asset-folder:'.length)]
      }

      if (itemId.startsWith('route-asset:')) {
        const asset = state.assetsById.get(itemId.slice('route-asset:'.length))
        return asset ? [asset.path] : []
      }

      return []
    })

    if (nextPaths.length === 0) {
      return
    }

    void navigator.clipboard.writeText([...new Set(nextPaths)].join('\n'))
  }

  function startRenameFromSelection() {
    if (state.selectedItemId.startsWith('route-asset-folder:')) {
      const folderPath = state.selectedItemId.slice('route-asset-folder:'.length)
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

    if (!state.selectedItemId.startsWith('route-asset:')) {
      return
    }

    const assetId = state.selectedItemId.slice('route-asset:'.length)
    const asset = state.assetsById.get(assetId)

    if (!asset) {
      return
    }

    actions.startRename(
      {
        kind: 'asset',
        assetId,
        path: asset.path,
        value: basename(asset.path)
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
      return
    }

    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      !hasModifier &&
      !event.shiftKey
    ) {
      event.preventDefault()
      actions.deleteSelection(state.selectedItemIds)
    }
  }

  const contextMenuSections = state.contextMenu
    ? buildRouteContextMenuSections({
        canDeleteSelection,
        contextMenu: state.contextMenu,
        contextAsset,
        hasSelection,
        expandedFolders: state.expandedFolders,
        selectionIncludesContextTarget,
        t,
        addCode: (parentPath = defaultFolderPath) => actions.addCode(parentPath),
        addFolder: (parentPath = defaultFolderPath) => actions.addFolder(parentPath),
        addMarkdown: (parentPath = defaultFolderPath) => actions.addMarkdown(parentPath),
        clearSelection,
        collapseAllFolders: actions.collapseAllFolders,
        copyPath: (path) => {
          void navigator.clipboard.writeText(path)
        },
        copySelectedPaths,
        deleteSelection: () => actions.deleteSelection(state.selectedItemIds),
        deleteTarget: actions.deleteTarget,
        disableSelection: () =>
          actions.setSelectionEnabled(state.selectedItemIds, false),
        enableSelection: () =>
          actions.setSelectionEnabled(state.selectedItemIds, true),
        expandAllFolders: actions.expandAllFolders,
        selectAllVisibleItems,
        selectFolderContents,
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
        onExpandedItemsChange={handleExpandedItemsChange}
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
        onTreeKeyDown={handleTreeKeyDown}
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
        selectedItemIds={state.selectedItemIds}
        orderedVisibleItemIds={state.orderedVisibleItemIds}
        setRenameTarget={state.setRenameTarget}
        storageKey="mdp-options-route-asset-tree-width"
        t={t}
        toggleAssetEnabled={actions.toggleAssetEnabled}
        toggleFolderAssetEnabled={actions.toggleFolderAssetEnabled}
      />
    </Stack>
  )
}

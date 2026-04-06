import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  SetStateAction
} from 'react'

import { SimpleTreeView } from '@mui/x-tree-view'

import type { BackgroundExposeAsset } from '#~/shared/config.js'
import { AssetEmptyState, type AssetFileTreeNode } from '../asset-tree-shared.js'
import {
  ScriptedAssetWorkspace,
  sharedAssetTreeSx,
  type AssetTreeToolbarAction
} from '../scripted-asset-workspace.js'
import { BackgroundAssetTreeNodeItem } from './tree-item.js'
import {
  getCollapsedBackgroundSelectionTarget,
  getSelectedBackgroundAssetId,
  handleBackgroundExpandedItemsChange
} from './tree-helpers.js'
import type {
  BackgroundDragState,
  BackgroundContextMenuTarget,
  BackgroundRenameTarget
} from './types.js'

export function BackgroundClientAssetsTab({
  detailPane,
  dragState,
  emptyLabel,
  expandedItems,
  filteredBackgroundTree,
  hasSearchResults,
  onCommitRename,
  onDropItem,
  onOpenContextMenu,
  onRenameChange,
  onSearchChange,
  onSearchKeyDown,
  onSelectItem,
  onStartRename,
  onTreeKeyDown,
  renameError,
  renameTarget,
  searchActions,
  searchInputRef,
  searchPlaceholder,
  searchQuery,
  searchTerm,
  selectedAssetPath,
  selectedFolderPath,
  selectedItemId,
  selectedItemIds,
  orderedVisibleItemIds,
  onRootDragLeave,
  onRootDrop,
  onSetDropTarget,
  onStartDrag,
  setExpandedFolders,
  setDisplayedAssetId,
  setRenameTarget,
  setSelectedItemIds,
  setSelectedItemId,
  sharedDisplayPrefix,
  toggleBackgroundAssetEnabled,
  toggleBackgroundFolderEnabled,
  dropTargetItemId,
  treeAssetEnabled
}: {
  detailPane: ReactNode
  dragState: BackgroundDragState | undefined
  emptyLabel: string
  expandedItems: string[]
  filteredBackgroundTree: AssetFileTreeNode[]
  hasSearchResults: boolean
  onCommitRename: () => void
  onDropItem: (folderPath: string, dragState: BackgroundDragState | undefined) => void
  onOpenContextMenu: (
    event: ReactMouseEvent,
    target: BackgroundContextMenuTarget
  ) => void
  onRenameChange: (value: string) => void
  onSearchChange: (value: string) => void
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  onSelectItem: (
    itemId: string,
    orderedItemIds: string[],
    event: ReactMouseEvent
  ) => void
  onStartRename: (target: BackgroundRenameTarget, itemId: string) => void
  onTreeKeyDown?: (event: ReactKeyboardEvent<HTMLDivElement>) => void
  renameError: boolean
  renameTarget: BackgroundRenameTarget | undefined
  searchActions: AssetTreeToolbarAction[]
  searchInputRef: MutableRefObject<HTMLInputElement | null>
  searchPlaceholder: string
  searchQuery: string
  searchTerm: string
  selectedAssetPath: string | undefined
  selectedFolderPath: string | undefined
  selectedItemId: string
  selectedItemIds: string[]
  orderedVisibleItemIds: string[]
  onRootDragLeave: () => void
  onRootDrop: (dragState: BackgroundDragState | undefined) => void
  onSetDropTarget: (itemId: string | undefined) => void
  onStartDrag: (state: BackgroundDragState | undefined) => void
  setExpandedFolders: Dispatch<SetStateAction<string[]>>
  setDisplayedAssetId: (
    assetId: BackgroundExposeAsset['id'] | undefined
  ) => void
  setRenameTarget: Dispatch<SetStateAction<BackgroundRenameTarget | undefined>>
  setSelectedItemIds: Dispatch<SetStateAction<string[]>>
  setSelectedItemId: Dispatch<SetStateAction<string>>
  sharedDisplayPrefix: string | undefined
  toggleBackgroundAssetEnabled: (assetId: BackgroundExposeAsset['id']) => void
  toggleBackgroundFolderEnabled: (folderPath: string) => void
  dropTargetItemId: string | undefined
  treeAssetEnabled: Map<BackgroundExposeAsset['id'], boolean>
}) {
  return (
    <ScriptedAssetWorkspace
      detailPane={detailPane}
      onRootContextMenu={(event) => onOpenContextMenu(event, { kind: 'root' })}
      onRootDragLeave={onRootDragLeave}
      onRootDragOver={(event) => {
        event.preventDefault()
        onSetDropTarget('root')
      }}
      onRootDrop={(event) => {
        event.preventDefault()
        onRootDrop(dragState)
      }}
      onSearchChange={onSearchChange}
      onSearchKeyDown={onSearchKeyDown}
      onTreeKeyDown={onTreeKeyDown}
      searchActions={searchActions}
      searchInputRef={searchInputRef}
      searchPlaceholder={searchPlaceholder}
      searchQuery={searchQuery}
      storageKey="mdp-options-background-asset-tree-width"
      sx={{ mt: '-1px !important' }}
      treePane={
        searchQuery.trim() && !hasSearchResults ? (
          <AssetEmptyState label={emptyLabel} minHeight={200} />
        ) : (
          <SimpleTreeView
            expandedItems={expandedItems}
            expansionTrigger="iconContainer"
            multiSelect
            onExpandedItemsChange={(_event, itemIds) => {
              const nextItemIds = itemIds as string[]
              const collapsedSelectionTarget = getCollapsedBackgroundSelectionTarget(
                expandedItems,
                nextItemIds,
                selectedItemId,
                selectedAssetPath,
                selectedFolderPath,
                sharedDisplayPrefix
              )

              if (collapsedSelectionTarget) {
                setSelectedItemId(collapsedSelectionTarget)
                setSelectedItemIds([collapsedSelectionTarget])
              }

              handleBackgroundExpandedItemsChange(nextItemIds, setExpandedFolders)
            }}
            onSelectedItemsChange={(_event, itemIds) => {
              const nextSelectedItemIds = Array.isArray(itemIds)
                ? (itemIds as string[])
                : itemIds
                  ? [itemIds as string]
                  : []
              const nextPrimaryItemId =
                nextSelectedItemIds.at(-1) ?? nextSelectedItemIds[0] ?? 'root'

              setSelectedItemIds(nextSelectedItemIds)
              setSelectedItemId(nextPrimaryItemId)

              const nextAssetId = getSelectedBackgroundAssetId(nextPrimaryItemId)

              if (nextAssetId) {
                setDisplayedAssetId(nextAssetId)
              }
            }}
            selectedItems={selectedItemIds}
            sx={sharedAssetTreeSx}
          >
            {filteredBackgroundTree.map((node) => (
              <BackgroundAssetTreeNodeItem
                key={node.id}
                node={node}
                dropTargetItemId={dropTargetItemId}
                onCancelRename={() => setRenameTarget(undefined)}
                onCommitRename={onCommitRename}
                onOpenContextMenu={onOpenContextMenu}
                onDropItem={(folderPath) => onDropItem(folderPath, dragState)}
                onRenameChange={onRenameChange}
                onSelectItem={onSelectItem}
                onSetDropTarget={onSetDropTarget}
                onStartDrag={onStartDrag}
                onStartRename={onStartRename}
                onToggleAssetEnabled={toggleBackgroundAssetEnabled}
                onToggleFolderEnabled={toggleBackgroundFolderEnabled}
                orderedVisibleItemIds={orderedVisibleItemIds}
                prefix="asset"
                renameError={renameError}
                renameTarget={renameTarget}
                searchTerm={searchTerm}
                assetEnabled={treeAssetEnabled}
              />
            ))}
          </SimpleTreeView>
        )
      }
    />
  )
}

import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
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
  BackgroundContextMenuTarget,
  BackgroundRenameTarget
} from './types.js'

export function BackgroundClientAssetsTab({
  detailPane,
  emptyLabel,
  expandedItems,
  filteredBackgroundTree,
  firstSearchResultItemId,
  hasSearchResults,
  onCommitRename,
  onOpenContextMenu,
  onRenameChange,
  onSearchChange,
  onSearchKeyDown,
  onStartRename,
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
  selectedTreeItemId,
  setDisplayedAssetId,
  setExpandedFolders,
  setRenameTarget,
  setSelectedItemId,
  sharedDisplayPrefix,
  toggleBackgroundAssetEnabled,
  toggleBackgroundFolderEnabled,
  treeAssetEnabled
}: {
  detailPane: ReactNode
  emptyLabel: string
  expandedItems: string[]
  filteredBackgroundTree: AssetFileTreeNode[]
  firstSearchResultItemId: string | undefined
  hasSearchResults: boolean
  onCommitRename: () => void
  onOpenContextMenu: (
    event: ReactMouseEvent,
    target: BackgroundContextMenuTarget
  ) => void
  onRenameChange: (value: string) => void
  onSearchChange: (value: string) => void
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  onStartRename: (target: BackgroundRenameTarget, itemId: string) => void
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
  selectedTreeItemId: string | null
  setDisplayedAssetId: (
    assetId: BackgroundExposeAsset['id'] | undefined
  ) => void
  setExpandedFolders: Dispatch<SetStateAction<string[]>>
  setRenameTarget: Dispatch<SetStateAction<BackgroundRenameTarget | undefined>>
  setSelectedItemId: Dispatch<SetStateAction<string>>
  sharedDisplayPrefix: string | undefined
  toggleBackgroundAssetEnabled: (assetId: BackgroundExposeAsset['id']) => void
  toggleBackgroundFolderEnabled: (folderPath: string) => void
  treeAssetEnabled: Map<BackgroundExposeAsset['id'], boolean>
}) {
  return (
    <ScriptedAssetWorkspace
      detailPane={detailPane}
      onRootContextMenu={(event) => onOpenContextMenu(event, { kind: 'root' })}
      onSearchChange={onSearchChange}
      onSearchKeyDown={onSearchKeyDown}
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
              }

              handleBackgroundExpandedItemsChange(nextItemIds, setExpandedFolders)
            }}
            onSelectedItemsChange={(_event, itemId) => {
              const nextItemId = (itemId as string | null) ?? 'root'
              setSelectedItemId(nextItemId)
              const nextAssetId = getSelectedBackgroundAssetId(nextItemId)

              if (nextAssetId) {
                setDisplayedAssetId(nextAssetId)
              }
            }}
            selectedItems={selectedTreeItemId}
            sx={sharedAssetTreeSx}
          >
            {filteredBackgroundTree.map((node) => (
              <BackgroundAssetTreeNodeItem
                key={node.id}
                node={node}
                onCancelRename={() => setRenameTarget(undefined)}
                onCommitRename={onCommitRename}
                onOpenContextMenu={onOpenContextMenu}
                onRenameChange={onRenameChange}
                onStartRename={onStartRename}
                onToggleAssetEnabled={toggleBackgroundAssetEnabled}
                onToggleFolderEnabled={toggleBackgroundFolderEnabled}
                prefix="asset"
                renameError={renameError}
                renameTarget={renameTarget}
                searchTerm={searchTerm}
                selectedItemId={selectedItemId}
                assetEnabled={treeAssetEnabled}
                setDisplayedAssetId={setDisplayedAssetId}
                setExpandedFolders={setExpandedFolders}
                setSelectedItemId={setSelectedItemId}
              />
            ))}
          </SimpleTreeView>
        )
      }
    />
  )
}

import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode
} from 'react'

import { SimpleTreeView } from '@mui/x-tree-view'

import { AssetEmptyState, type AssetFileTreeNode } from '../asset-tree-shared.js'
import {
  ScriptedAssetWorkspace,
  sharedAssetTreeSx,
  type AssetTreeToolbarAction
} from '../scripted-asset-workspace.js'
import {
  ScriptedAssetContextMenu,
  type ScriptedAssetContextMenuSection
} from '../scripted-asset-shared.js'
import { renderTreeNodes } from './tree.js'
import type {
  ClientTreeItem,
  DragState,
  RouteRenameTarget,
  TreeContextMenuTarget,
  TreeContextMenuState
} from './types.js'

export function ClientAssetsWorkspace({
  assetEnabled,
  assetKinds,
  assetMethods,
  contextMenu,
  contextMenuSections,
  detailPane,
  dragState,
  dropTargetItemId,
  expandedItems,
  filteredTree,
  onExpandedItemsChange,
  onCloseContextMenu,
  onCommitRename,
  onDropItem,
  onOpenContextMenu,
  onOpenItem,
  onRenameChange,
  onRootDragLeave,
  onRootDrop,
  onSearchChange,
  onTreeKeyDown,
  onSetDropTarget,
  onStartDrag,
  onStartRename,
  renameError,
  renameTarget,
  searchActions,
  searchQuery,
  selectedItemId,
  selectedItemIds,
  orderedVisibleItemIds,
  setRenameTarget,
  storageKey,
  t,
  toggleAssetEnabled,
  toggleFolderAssetEnabled
}: {
  assetEnabled: Map<string, boolean>
  assetKinds: Map<string, ClientTreeItem['kind']>
  assetMethods: Map<
    string,
    'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | undefined
  >
  contextMenu: TreeContextMenuState | undefined
  contextMenuSections: ScriptedAssetContextMenuSection[]
  detailPane: ReactNode
  dragState: DragState | undefined
  dropTargetItemId: string | undefined
  expandedItems: string[]
  filteredTree: AssetFileTreeNode[]
  onExpandedItemsChange: (itemIds: string[]) => void
  onCloseContextMenu: () => void
  onCommitRename: () => void
  onDropItem: (folderPath: string, itemId: string, dragState: DragState | undefined) => void
  onOpenContextMenu: (
    event: ReactMouseEvent,
    target: TreeContextMenuTarget
  ) => void
  onOpenItem: (
    itemId: string,
    orderedItemIds: string[],
    event: ReactMouseEvent
  ) => void
  onRenameChange: (value: string) => void
  onRootDragLeave: () => void
  onRootDrop: (dragState: DragState | undefined) => void
  onSearchChange: (value: string) => void
  onTreeKeyDown?: (event: ReactKeyboardEvent<HTMLDivElement>) => void
  onSetDropTarget: (value: string | undefined) => void
  onStartDrag: (value: DragState | undefined) => void
  onStartRename: (target: RouteRenameTarget, itemId: string) => void
  renameError: boolean
  renameTarget: RouteRenameTarget | undefined
  searchActions: AssetTreeToolbarAction[]
  searchQuery: string
  selectedItemId: string
  selectedItemIds: string[]
  orderedVisibleItemIds: string[]
  setRenameTarget: (
    value:
      | RouteRenameTarget
      | undefined
      | ((current: RouteRenameTarget | undefined) => RouteRenameTarget | undefined)
  ) => void
  storageKey: string
  t: (key: string) => string
  toggleAssetEnabled: (assetId: string) => void
  toggleFolderAssetEnabled: (folderPath: string) => void
}) {
  return (
    <>
      <ScriptedAssetWorkspace
        detailPane={detailPane}
        onRootContextMenu={(event) =>
          onOpenContextMenu(event, {
            kind: 'root',
            folderPath: ''
          })
        }
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
        onTreeKeyDown={onTreeKeyDown}
        searchActions={searchActions}
        searchPlaceholder={t('options.assets.search')}
        searchQuery={searchQuery}
        storageKey={storageKey}
        sx={{ mt: '-10px !important' }}
        treePane={
          filteredTree.length === 0 ? (
            <AssetEmptyState label={t('options.assets.searchEmpty')} minHeight={180} />
          ) : (
            <SimpleTreeView
              expansionTrigger="iconContainer"
              expandedItems={expandedItems}
              multiSelect
              onExpandedItemsChange={(_event, itemIds) =>
                onExpandedItemsChange(itemIds as string[])
              }
              selectedItems={selectedItemIds}
              sx={sharedAssetTreeSx}
            >
              {renderTreeNodes(filteredTree, {
                onCancelRename: () => setRenameTarget(undefined),
                onCommitRename,
                onDropItem: (folderPath, itemId) =>
                  onDropItem(folderPath, itemId, dragState),
                onOpenContextMenu,
                onOpenItem,
                onRenameChange,
                onSetDropTarget,
                onStartDrag,
                onStartRename,
                orderedVisibleItemIds,
                dropTargetItemId,
                renameError,
                renameTarget,
                searchTerm: searchQuery,
                assetEnabled,
                assetKinds,
                assetMethods,
                onToggleAssetEnabled: toggleAssetEnabled,
                onToggleFolderEnabled: toggleFolderAssetEnabled
              })}
            </SimpleTreeView>
          )
        }
      />

      <ScriptedAssetContextMenu
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        onClose={onCloseContextMenu}
        open={Boolean(contextMenu)}
        sections={contextMenuSections}
      />
    </>
  )
}

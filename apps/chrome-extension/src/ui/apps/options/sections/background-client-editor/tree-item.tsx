import { Typography } from '@mui/material'
import { TreeItem } from '@mui/x-tree-view'
import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent
} from 'react'

import {
  getBackgroundExposeDefinition,
  type BackgroundExposeAsset
} from '#~/shared/config.js'
import {
  AssetTreeLeaf,
  AssetTreeLabel,
  AssetTreeRenameField,
  dirname,
  resolveAssetEnabledState,
  resolveFolderEnabledState,
  renderHighlightedText,
  type AssetFileTreeNode
} from '../asset-tree-shared.js'
import {
  HttpMethodBadge,
  ScriptedAssetEnabledButton
} from '../scripted-asset-shared.js'
import type {
  BackgroundContextMenuTarget,
  BackgroundDragState,
  BackgroundRenameTarget,
  BackgroundTreePrefix
} from './types.js'

export function BackgroundAssetTreeNodeItem({
  node,
  dropTargetItemId,
  onOpenContextMenu,
  onDropItem,
  onSelectItem,
  onSetDropTarget,
  onStartDrag,
  prefix,
  renameError,
  renameTarget,
  searchTerm,
  orderedVisibleItemIds,
  assetEnabled = new Map(),
  onCancelRename,
  onCommitRename,
  onRenameChange,
  onStartRename,
  onToggleAssetEnabled,
  onToggleFolderEnabled
}: {
  node: AssetFileTreeNode
  dropTargetItemId: string | undefined
  onOpenContextMenu: (
    event: ReactMouseEvent,
    target: BackgroundContextMenuTarget
  ) => void
  onDropItem: (folderPath: string) => void
  onSelectItem: (
    itemId: string,
    orderedItemIds: string[],
    event: ReactMouseEvent
  ) => void
  onSetDropTarget: (itemId: string | undefined) => void
  onStartDrag: (state: BackgroundDragState | undefined) => void
  prefix: BackgroundTreePrefix
  renameError: boolean
  renameTarget: BackgroundRenameTarget | undefined
  searchTerm?: string
  orderedVisibleItemIds: string[]
  assetEnabled?: Map<BackgroundExposeAsset['id'], boolean>
  onCancelRename: () => void
  onCommitRename: () => void
  onRenameChange: (value: string) => void
  onStartRename: (target: BackgroundRenameTarget, itemId: string) => void
  onToggleAssetEnabled: (assetId: BackgroundExposeAsset['id']) => void
  onToggleFolderEnabled: (folderPath: string) => void
}) {
  if (node.kind === 'folder') {
    const itemId = `${prefix}-folder:${node.path}`
    const enabledState = resolveFolderEnabledState(node, assetEnabled)

    return (
      <TreeItem
        itemId={itemId}
        label={
          <div
            draggable
            onContextMenu={(event) =>
              onOpenContextMenu(event, {
                kind: 'folder',
                folderPath: node.path
              })
            }
            onDoubleClick={() =>
              onStartRename(
                {
                  kind: 'folder',
                  path: node.path,
                  value: node.label
                },
                itemId
              )
            }
            onDragStart={() =>
              onStartDrag({
                kind: 'folder',
                path: node.path
              })
            }
            onDragEnd={() => {
              onSetDropTarget(undefined)
              onStartDrag(undefined)
            }}
            onDragOver={(event) =>
              handleDragOver(event, () => onSetDropTarget(itemId))
            }
            onDragLeave={() => onSetDropTarget(undefined)}
            onDrop={(event) => handleDrop(event, () => onDropItem(node.path))}
          >
            <AssetTreeLabel
              action={
                <ScriptedAssetEnabledButton
                  onClick={() => onToggleFolderEnabled(node.path)}
                  state={enabledState}
                />
              }
              dropActive={dropTargetItemId === itemId}
              onClick={(event) =>
                onSelectItem(itemId, orderedVisibleItemIds, event)
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
                  renderHighlightedText(node.label, searchTerm)
                )
              }
            />
          </div>
        }
      >
        {node.children.map((child) => (
          <BackgroundAssetTreeNodeItem
            key={child.id}
            node={child}
            dropTargetItemId={dropTargetItemId}
            onOpenContextMenu={onOpenContextMenu}
            onDropItem={onDropItem}
            onSelectItem={onSelectItem}
            onSetDropTarget={onSetDropTarget}
            onStartDrag={onStartDrag}
            prefix={prefix}
            renameError={renameError}
            renameTarget={renameTarget}
            searchTerm={searchTerm}
            orderedVisibleItemIds={orderedVisibleItemIds}
            assetEnabled={assetEnabled}
            onCancelRename={onCancelRename}
            onCommitRename={onCommitRename}
            onRenameChange={onRenameChange}
            onStartRename={onStartRename}
            onToggleAssetEnabled={onToggleAssetEnabled}
            onToggleFolderEnabled={onToggleFolderEnabled}
          />
        ))}
      </TreeItem>
    )
  }

  const definition = getBackgroundExposeDefinition(
    node.assetId as BackgroundExposeAsset['id']
  )
  const itemId = `${prefix}:${node.assetId}`
  const assetId = node.assetId as BackgroundExposeAsset['id']

  return (
    <TreeItem
      itemId={itemId}
      label={
        <div
          draggable
          onContextMenu={(event) =>
            onOpenContextMenu(event, {
              kind: 'asset',
              assetId: node.assetId as BackgroundExposeAsset['id'],
              folderPath: dirname(node.path)
            })
          }
          onDoubleClick={() =>
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
          onDragStart={() =>
            onStartDrag({
              kind: 'asset',
              assetId,
              path: node.path
            })
          }
          onDragEnd={() => {
            onSetDropTarget(undefined)
            onStartDrag(undefined)
          }}
        >
          <AssetTreeLeaf
            action={
              <ScriptedAssetEnabledButton
                onClick={() => onToggleAssetEnabled(assetId)}
                state={resolveAssetEnabledState(assetId, assetEnabled)}
              />
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
            onClick={(event) => {
              onSelectItem(itemId, orderedVisibleItemIds, event)
            }}
          />
        </div>
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
  return <HttpMethodBadge method={definition?.method} />
}

function handleDragOver(
  event: ReactDragEvent,
  onSetDropTarget: () => void
) {
  event.preventDefault()
  event.stopPropagation()
  onSetDropTarget()
}

function handleDrop(
  event: ReactDragEvent,
  onDropItem: () => void
) {
  event.preventDefault()
  event.stopPropagation()
  onDropItem()
}

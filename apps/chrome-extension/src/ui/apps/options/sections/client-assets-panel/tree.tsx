import { Box, Typography } from '@mui/material'
import { TreeItem } from '@mui/x-tree-view'
import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode
} from 'react'

import { ROOT_ROUTE_SKILL_PATH } from '#~/shared/config.js'
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
  ClientTreeItem,
  DragState,
  RouteRenameTarget
} from './types.js'

export function renderTreeNodes(
  nodes: AssetFileTreeNode[],
  options: {
    onCancelRename: () => void
    onOpenItem: (itemId: string) => void
    onCommitRename: () => void
    onOpenContextMenu: (
      event: ReactMouseEvent,
      target: {
        kind: 'asset' | 'folder' | 'root'
        assetId?: string
        folderPath: string
      }
    ) => void
    onRenameChange: (value: string) => void
    onStartRename: (target: RouteRenameTarget, itemId: string) => void
    onDropItem: (folderPath: string, itemId: string) => void
    onSetDropTarget: (itemId: string | undefined) => void
    onStartDrag: (value: DragState | undefined) => void
    dropTargetItemId: string | undefined
    renameError: boolean
    renameTarget: RouteRenameTarget | undefined
    searchTerm: string
    assetKinds: Map<string, ClientTreeItem['kind']>
    assetMethods: Map<
      string,
      'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | undefined
    >
    assetEnabled: Map<string, boolean>
    onToggleAssetEnabled: (assetId: string) => void
    onToggleFolderEnabled: (folderPath: string) => void
  }
): ReactNode {
  return nodes.map((node) => {
    if (node.kind === 'folder') {
      const itemId = `route-asset-folder:${node.path}`
      const enabledState = resolveFolderEnabledState(
        node,
        options.assetEnabled
      )

      return (
        <TreeItem
          key={itemId}
          itemId={itemId}
          label={
            <Box
              draggable
              onContextMenu={(event) =>
                options.onOpenContextMenu(event, {
                  kind: 'folder',
                  folderPath: node.path
                })
              }
              onDoubleClick={() =>
                options.onStartRename(
                  {
                    kind: 'folder',
                    path: node.path,
                    value: node.label
                  },
                  itemId
                )
              }
              onDragStart={() =>
                options.onStartDrag({
                  kind: 'folder',
                  path: node.path
                })
              }
              onDragEnd={() => {
                options.onStartDrag(undefined)
              }}
              onDragOver={(event) => handleDragOver(event, () => options.onSetDropTarget(itemId))}
              onDragLeave={() => options.onSetDropTarget(undefined)}
              onDrop={(event) => handleDrop(event, () => options.onDropItem(node.path, itemId))}
            >
              <AssetTreeLabel
                action={
                  <ScriptedAssetEnabledButton
                    onClick={() => options.onToggleFolderEnabled(node.path)}
                    state={enabledState}
                  />
                }
                dropActive={options.dropTargetItemId === itemId}
                label={
                  options.renameTarget?.kind === 'folder' &&
                  options.renameTarget.path === node.path ? (
                    <AssetTreeRenameField
                      error={options.renameError}
                      onCancel={options.onCancelRename}
                      onChange={options.onRenameChange}
                      onCommit={options.onCommitRename}
                      value={options.renameTarget.value}
                    />
                  ) : (
                    node.label
                  )
                }
                onClick={() => options.onOpenItem(itemId)}
                searchTerm={options.searchTerm}
              />
            </Box>
          }
        >
          {renderTreeNodes(node.children, options)}
        </TreeItem>
      )
    }

    const itemId = `route-asset:${node.assetId}`
    const isRootSkill =
      options.assetKinds.get(node.assetId) === 'skill' &&
      node.path === ROOT_ROUTE_SKILL_PATH
    return (
      <TreeItem
        key={itemId}
        itemId={itemId}
        label={
          <Box
            draggable={!isRootSkill}
            onContextMenu={(event) =>
              options.onOpenContextMenu(event, {
                kind: 'asset',
                assetId: node.assetId,
                folderPath: dirname(node.path)
              })
            }
            onDoubleClick={() => {
              if (isRootSkill) {
                return
              }

              options.onStartRename(
                {
                  kind: 'asset',
                  assetId: node.assetId,
                  path: node.path,
                  value: node.label
                },
                itemId
              )
            }}
            onDragStart={() =>
              options.onStartDrag({
                kind: 'asset',
                assetId: node.assetId,
                path: node.path
              })
            }
            onDragEnd={() => {
              options.onStartDrag(undefined)
            }}
          >
            <AssetTreeLeaf
              action={
                options.assetEnabled.has(node.assetId) ? (
                  <ScriptedAssetEnabledButton
                    onClick={() => options.onToggleAssetEnabled(node.assetId)}
                    state={resolveAssetEnabledState(node.assetId, options.assetEnabled)}
                  />
                ) : undefined
              }
              icon={
                <HttpMethodBadge
                  fallback={resolveAssetBadge(options.assetKinds.get(node.assetId) ?? 'skill')}
                  method={options.assetMethods.get(node.assetId)}
                />
              }
              label={
                options.renameTarget?.kind === 'asset' &&
                options.renameTarget.assetId === node.assetId ? (
                  <AssetTreeRenameField
                    error={options.renameError}
                    onCancel={options.onCancelRename}
                    onChange={options.onRenameChange}
                    onCommit={options.onCommitRename}
                    value={options.renameTarget.value}
                  />
                ) : (
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {renderHighlightedText(node.label, options.searchTerm)}
                  </Typography>
                )
              }
              onClick={() => options.onOpenItem(itemId)}
            />
          </Box>
        }
      />
    )
  })
}

function resolveAssetBadge(kind: ClientTreeItem['kind']): 'G' | 'P' | 'M' {
  if (kind === 'skill') {
    return 'M'
  }

  return kind === 'resource' ? 'G' : 'P'
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

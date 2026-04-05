import { Typography } from '@mui/material'
import { TreeItem } from '@mui/x-tree-view'
import type { MouseEvent as ReactMouseEvent } from 'react'

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
import {
  handleBackgroundExpandableItemClick
} from './tree-helpers.js'
import type {
  BackgroundContextMenuTarget,
  BackgroundRenameTarget,
  BackgroundTreePrefix
} from './types.js'

export function BackgroundAssetTreeNodeItem({
  node,
  onOpenContextMenu,
  prefix,
  renameError,
  renameTarget,
  searchTerm,
  selectedItemId,
  assetEnabled = new Map(),
  setExpandedFolders,
  setDisplayedAssetId,
  setSelectedItemId,
  onCancelRename,
  onCommitRename,
  onRenameChange,
  onStartRename,
  onToggleAssetEnabled,
  onToggleFolderEnabled
}: {
  node: AssetFileTreeNode
  onOpenContextMenu: (
    event: ReactMouseEvent,
    target: BackgroundContextMenuTarget
  ) => void
  prefix: BackgroundTreePrefix
  renameError: boolean
  renameTarget: BackgroundRenameTarget | undefined
  searchTerm?: string
  selectedItemId: string
  assetEnabled?: Map<BackgroundExposeAsset['id'], boolean>
  setExpandedFolders: (updater: (paths: string[]) => string[]) => void
  setDisplayedAssetId: (
    assetId: BackgroundExposeAsset['id'] | undefined
  ) => void
  setSelectedItemId: (itemId: string) => void
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
          <AssetTreeLabel
            action={
              <ScriptedAssetEnabledButton
                onClick={() => onToggleFolderEnabled(node.path)}
                state={enabledState}
              />
            }
            selected={selectedItemId === itemId}
            onClick={(event) =>
              handleBackgroundExpandableItemClick(
                event,
                itemId,
                setSelectedItemId,
                setExpandedFolders
              )
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
        }
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
      >
        {node.children.map((child) => (
          <BackgroundAssetTreeNodeItem
            key={child.id}
            node={child}
            onOpenContextMenu={onOpenContextMenu}
            prefix={prefix}
            renameError={renameError}
            renameTarget={renameTarget}
            searchTerm={searchTerm}
            selectedItemId={selectedItemId}
            assetEnabled={assetEnabled}
            setExpandedFolders={setExpandedFolders}
            setDisplayedAssetId={setDisplayedAssetId}
            setSelectedItemId={setSelectedItemId}
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
        <AssetTreeLeaf
          action={
            <ScriptedAssetEnabledButton
              onClick={() => onToggleAssetEnabled(assetId)}
              state={resolveAssetEnabledState(assetId, assetEnabled)}
            />
          }
          icon={<BackgroundMethodBadge definition={definition} />}
          selected={selectedItemId === itemId}
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
          onClick={() => {
            setSelectedItemId(itemId)
            setDisplayedAssetId(assetId)
          }}
        />
      }
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

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
  renderHighlightedText,
  type AssetFileTreeNode
} from '../asset-tree-shared.js'
import {
  HttpMethodBadge,
  ScriptedAssetEnabledButton,
  type ScriptedAssetEnabledState
} from '../scripted-asset-shared.js'
import {
  handleBackgroundExpandableItemClick
} from './tree-helpers.js'
import type {
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
  assetEnabled = new Map(),
  setExpandedFolders,
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
    target: {
      kind: 'asset' | 'folder' | 'root'
      assetId?: BackgroundExposeAsset['id']
      folderPath?: string
      itemId?: string
    }
  ) => void
  prefix: BackgroundTreePrefix
  renameError: boolean
  renameTarget: BackgroundRenameTarget | undefined
  searchTerm?: string
  assetEnabled?: Map<BackgroundExposeAsset['id'], boolean>
  setExpandedFolders: (updater: (paths: string[]) => string[]) => void
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
            count={countLeafFiles(node)}
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
            folderPath: node.path,
            itemId
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
            assetEnabled={assetEnabled}
            setExpandedFolders={setExpandedFolders}
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
              state={assetEnabled.get(assetId) ? 'enabled' : 'disabled'}
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
          onClick={() => setSelectedItemId(itemId)}
        />
      }
      onContextMenu={(event) =>
        onOpenContextMenu(event, {
          kind: 'asset',
          assetId: node.assetId as BackgroundExposeAsset['id'],
          folderPath: dirname(node.path),
          itemId
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

function countLeafFiles(node: AssetFileTreeNode): number {
  if (node.kind === 'file') {
    return 1
  }

  return node.children.reduce((total, child) => total + countLeafFiles(child), 0)
}

function resolveFolderEnabledState(
  node: AssetFileTreeNode,
  assetEnabled: Map<BackgroundExposeAsset['id'], boolean>
): ScriptedAssetEnabledState {
  const leafStates = collectLeafEnabledStates(node, assetEnabled)

  if (leafStates.length === 0) {
    return 'disabled'
  }

  if (leafStates.every(Boolean)) {
    return 'enabled'
  }

  if (leafStates.every((state) => !state)) {
    return 'disabled'
  }

  return 'mixed'
}

function collectLeafEnabledStates(
  node: AssetFileTreeNode,
  assetEnabled: Map<BackgroundExposeAsset['id'], boolean>
): boolean[] {
  if (node.kind === 'file') {
    return [assetEnabled.get(node.assetId as BackgroundExposeAsset['id']) ?? true]
  }

  return node.children.flatMap((child) =>
    collectLeafEnabledStates(child, assetEnabled)
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

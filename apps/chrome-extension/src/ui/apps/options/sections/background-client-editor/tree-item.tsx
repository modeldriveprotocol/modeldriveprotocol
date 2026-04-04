import FolderOutlined from '@mui/icons-material/FolderOutlined'
import { Typography } from '@mui/material'
import { TreeItem } from '@mui/x-tree-view'
import type { MouseEvent as ReactMouseEvent } from 'react'

import {
  getBackgroundExposeDefinition,
  type BackgroundExposeAsset
} from '#~/shared/config.js'
import {
  AssetTreeLeaf,
  AssetTreeRenameField,
  dirname,
  renderHighlightedText,
  type AssetFileTreeNode
} from '../asset-tree-shared.js'
import { HttpMethodBadge } from '../scripted-asset-shared.js'
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
  setExpandedFolders,
  setSelectedItemId,
  onCancelRename,
  onCommitRename,
  onRenameChange,
  onStartRename
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
  setExpandedFolders: (updater: (paths: string[]) => string[]) => void
  setSelectedItemId: (itemId: string) => void
  onCancelRename: () => void
  onCommitRename: () => void
  onRenameChange: (value: string) => void
  onStartRename: (target: BackgroundRenameTarget, itemId: string) => void
}) {
  if (node.kind === 'folder') {
    const itemId = `${prefix}-folder:${node.path}`

    return (
      <TreeItem
        itemId={itemId}
        label={
          <AssetTreeLeaf
            onClick={(event) =>
              handleBackgroundExpandableItemClick(
                event,
                itemId,
                setSelectedItemId,
                setExpandedFolders
              )
            }
            icon={<FolderOutlined fontSize="small" />}
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
            setExpandedFolders={setExpandedFolders}
            setSelectedItemId={setSelectedItemId}
            onCancelRename={onCancelRename}
            onCommitRename={onCommitRename}
            onRenameChange={onRenameChange}
            onStartRename={onStartRename}
          />
        ))}
      </TreeItem>
    )
  }

  const definition = getBackgroundExposeDefinition(
    node.assetId as BackgroundExposeAsset['id']
  )
  const itemId = `${prefix}:${node.assetId}`

  return (
    <TreeItem
      itemId={itemId}
      label={
        <AssetTreeLeaf
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

function BackgroundMethodBadge({
  definition
}: {
  definition:
    | ReturnType<typeof getBackgroundExposeDefinition>
    | undefined
}) {
  return <HttpMethodBadge method={definition?.method} />
}

import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import UnfoldLessOutlined from '@mui/icons-material/UnfoldLessOutlined'
import UnfoldMoreOutlined from '@mui/icons-material/UnfoldMoreOutlined'

import type { BackgroundExposeAsset } from '#~/shared/config.js'
import { basename } from '../asset-tree-shared.js'
import type { ScriptedAssetContextMenuSection } from '../scripted-asset-shared.js'
import {
  getBackgroundDisplayPath
} from './tree-helpers.js'
import type {
  BackgroundContextMenuState,
  BackgroundRenameTarget
} from './types.js'

export function buildBackgroundContextMenuSections(options: {
  contextAsset: BackgroundExposeAsset | undefined
  contextMenu: BackgroundContextMenuState
  expandedFolders: string[]
  hasSelection: boolean
  selectionIncludesContextTarget: boolean
  sharedDisplayPrefix: string | undefined
  t: (key: string) => string
  clearSelection: () => void
  copyPath: (path: string) => void
  copySelectedPaths: () => void
  collapseAllFolders: () => void
  disableSelection: () => void
  enableSelection: () => void
  expandAllFolders: () => void
  selectAllVisibleItems: () => void
  selectFolderContents: (folderPath: string) => void
  startRename: (
    target: BackgroundRenameTarget,
    itemId: string
  ) => void
  toggleFolder: (folderPath: string) => void
}): ScriptedAssetContextMenuSection[] {
  const {
    contextAsset,
    contextMenu,
    expandedFolders,
    hasSelection,
    selectionIncludesContextTarget,
    sharedDisplayPrefix,
    t
  } = options
  const selectionSection = hasSelection
    ? {
        key: 'selection',
        title: t('options.assets.menu.section.selection'),
        items: [
          {
            key: 'copy-selected-paths',
            label: t('options.assets.menu.copySelectedPaths'),
            icon: <ContentCopyOutlined fontSize="small" />,
            onSelect: options.copySelectedPaths
          },
          {
            key: 'enable-selection',
            label: t('options.assets.menu.enableSelection'),
            icon: <UnfoldMoreOutlined fontSize="small" />,
            onSelect: options.enableSelection
          },
          {
            key: 'disable-selection',
            label: t('options.assets.menu.disableSelection'),
            icon: <UnfoldLessOutlined fontSize="small" />,
            onSelect: options.disableSelection
          },
          {
            key: 'clear-selection',
            label: t('options.assets.menu.clearSelection'),
            icon: <EditOutlined fontSize="small" />,
            onSelect: options.clearSelection
          }
        ]
      }
    : undefined

  if (contextMenu.kind === 'root') {
    return [
      {
        key: 'tree',
        title: t('options.assets.menu.section.tree'),
        items: [
          {
            key: 'expand-all',
            label: t('options.assets.menu.expandAll'),
            icon: <UnfoldMoreOutlined fontSize="small" />,
            onSelect: options.expandAllFolders
          },
          {
            key: 'collapse-all',
            label: t('options.assets.menu.collapseAll'),
            icon: <UnfoldLessOutlined fontSize="small" />,
            onSelect: options.collapseAllFolders
          },
          {
            key: 'select-all',
            label: t('options.assets.menu.selectAll'),
            icon: <UnfoldMoreOutlined fontSize="small" />,
            onSelect: options.selectAllVisibleItems
          }
        ]
      },
      ...(selectionSection ? [selectionSection] : [])
    ]
  }

  if (contextMenu.kind === 'folder' && contextMenu.folderPath) {
    const isExpanded = expandedFolders.includes(contextMenu.folderPath)
    return [
      {
        key: 'folder',
        title: t('options.assets.menu.section.folder'),
        items: [
          {
            key: isExpanded ? 'collapse' : 'expand',
            label: isExpanded
              ? t('options.assets.menu.collapseFolder')
              : t('options.assets.menu.expandFolder'),
            icon: isExpanded ? (
              <UnfoldLessOutlined fontSize="small" />
            ) : (
              <UnfoldMoreOutlined fontSize="small" />
            ),
            onSelect: () => options.toggleFolder(contextMenu.folderPath!)
          },
          {
            key: 'rename',
            label: t('options.assets.renameItem'),
            icon: <EditOutlined fontSize="small" />,
            onSelect: () =>
              options.startRename(
                {
                  kind: 'folder',
                  path: contextMenu.folderPath!,
                  value: basename(contextMenu.folderPath!)
                },
                `asset-folder:${contextMenu.folderPath}`
              )
          },
          {
            key: 'copy-path',
            label: t('options.assets.menu.copyPath'),
            icon: <ContentCopyOutlined fontSize="small" />,
            onSelect: () => options.copyPath(contextMenu.folderPath!)
          },
          {
            key: 'select-folder-contents',
            label: t('options.assets.menu.selectFolderContents'),
            icon: <UnfoldMoreOutlined fontSize="small" />,
            onSelect: () => options.selectFolderContents(contextMenu.folderPath!)
          }
        ]
      },
      ...(selectionIncludesContextTarget && selectionSection
        ? [selectionSection]
        : [])
    ]
  }

  return [
    {
      key: 'file',
      title: t('options.assets.menu.section.file'),
      items: [
        {
          key: 'rename',
          label: t('options.assets.renameItem'),
          icon: <EditOutlined fontSize="small" />,
          disabled: !contextAsset,
          onSelect: () =>
            contextAsset
              ? options.startRename(
                  {
                    kind: 'asset',
                    assetId: contextAsset.id,
                    path: getBackgroundDisplayPath(
                      contextAsset.path,
                      sharedDisplayPrefix
                    ),
                    value: basename(
                      getBackgroundDisplayPath(
                        contextAsset.path,
                        sharedDisplayPrefix
                      )
                    )
                  },
                  `asset:${contextAsset.id}`
                )
              : undefined
        },
        {
          key: 'copy-path',
          label: t('options.assets.menu.copyPath'),
          icon: <ContentCopyOutlined fontSize="small" />,
          disabled: !contextAsset,
          onSelect: () =>
            contextAsset
              ? options.copyPath(
                  getBackgroundDisplayPath(contextAsset.path, sharedDisplayPrefix)
                )
              : undefined
        }
      ]
    },
    ...(selectionIncludesContextTarget && selectionSection
      ? [selectionSection]
      : [])
  ]
}

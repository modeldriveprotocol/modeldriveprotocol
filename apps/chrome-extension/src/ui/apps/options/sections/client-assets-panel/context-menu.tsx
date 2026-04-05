import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import JavascriptOutlined from '@mui/icons-material/JavascriptOutlined'
import UnfoldLessOutlined from '@mui/icons-material/UnfoldLessOutlined'
import UnfoldMoreOutlined from '@mui/icons-material/UnfoldMoreOutlined'

import { isRootRouteSkillPath, type RouteExposeAsset } from '#~/shared/config.js'
import { basename } from './asset-helpers.js'
import type { ScriptedAssetContextMenuSection } from '../scripted-asset-shared.js'
import type {
  RouteRenameTarget,
  TreeContextMenuTarget,
  TreeMutationTarget,
  TreeContextMenuState
} from './types.js'

export function buildRouteContextMenuSections(options: {
  contextMenu: TreeContextMenuState
  contextAsset: RouteExposeAsset | undefined
  expandedFolders: string[]
  t: (key: string) => string
  addCode: (parentPath?: string) => void
  addMarkdown: (parentPath?: string) => void
  addFolder: (parentPath?: string) => void
  collapseAllFolders: () => void
  copyPath: (path: string) => void
  deleteTarget: (
    target: TreeMutationTarget
  ) => void
  expandAllFolders: () => void
  startRename: (target: RouteRenameTarget, itemId: string) => void
  toggleFolder: (folderPath: string) => void
}): ScriptedAssetContextMenuSection[] {
  const { contextAsset, contextMenu, expandedFolders, t } = options
  const isRootSkill =
    contextAsset?.kind === 'skill' && isRootRouteSkillPath(contextAsset.path)
  const isExpanded =
    contextMenu.kind === 'folder' &&
    expandedFolders.includes(contextMenu.folderPath)

  if (contextMenu.kind === 'root') {
    return [
      {
        key: 'create',
        title: t('options.assets.menu.section.create'),
        items: [
          {
            key: 'new-code',
            label: t('options.assets.menu.newCode'),
            icon: <JavascriptOutlined fontSize="small" />,
            onSelect: () => options.addCode('')
          },
          {
            key: 'new-skill',
            label: t('options.assets.menu.newSkill'),
            icon: <DescriptionOutlined fontSize="small" />,
            onSelect: () => options.addMarkdown('')
          },
          {
            key: 'new-folder',
            label: t('options.assets.menu.newFolder'),
            icon: <FolderOutlined fontSize="small" />,
            onSelect: () => options.addFolder('')
          }
        ]
      },
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
          }
        ]
      }
    ]
  }

  if (contextMenu.kind === 'folder') {
    return [
      {
        key: 'create',
        title: t('options.assets.menu.section.createInFolder'),
        items: [
          {
            key: 'new-code',
            label: t('options.assets.menu.newCode'),
            icon: <JavascriptOutlined fontSize="small" />,
            onSelect: () => options.addCode(contextMenu.folderPath)
          },
          {
            key: 'new-skill',
            label: t('options.assets.menu.newSkill'),
            icon: <DescriptionOutlined fontSize="small" />,
            onSelect: () => options.addMarkdown(contextMenu.folderPath)
          },
          {
            key: 'new-folder',
            label: t('options.assets.menu.newFolder'),
            icon: <FolderOutlined fontSize="small" />,
            onSelect: () => options.addFolder(contextMenu.folderPath)
          }
        ]
      },
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
            onSelect: () => options.toggleFolder(contextMenu.folderPath)
          },
          {
            key: 'rename',
            label: t('options.assets.renameItem'),
            icon: <EditOutlined fontSize="small" />,
            onSelect: () =>
              options.startRename(
                {
                  kind: 'folder',
                  path: contextMenu.folderPath,
                  value: basename(contextMenu.folderPath)
                },
                `route-asset-folder:${contextMenu.folderPath}`
              )
          },
          {
            key: 'copy-path',
            label: t('options.assets.menu.copyPath'),
            icon: <ContentCopyOutlined fontSize="small" />,
            onSelect: () => options.copyPath(contextMenu.folderPath)
          },
          {
            key: 'delete',
            label: t('options.assets.deleteFolder'),
            icon: <DeleteOutlineOutlined fontSize="small" />,
            tone: 'danger',
            onSelect: () =>
              options.deleteTarget({
                folderPath: contextMenu.folderPath
              })
          }
        ]
      }
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
          disabled: !contextAsset || isRootSkill,
          onSelect: () =>
            contextAsset
              ? options.startRename(
                  {
                    kind: 'asset',
                    assetId: contextAsset.id,
                    path: contextAsset.path,
                    value: basename(contextAsset.path)
                  },
                  `route-asset:${contextAsset.id}`
                )
              : undefined
        },
        {
          key: 'copy-path',
          label: t('options.assets.menu.copyPath'),
          icon: <ContentCopyOutlined fontSize="small" />,
          disabled: !contextAsset,
          onSelect: () => (contextAsset ? options.copyPath(contextAsset.path) : undefined)
        },
        {
          key: 'delete',
          label: t('options.assets.deleteItem'),
          icon: <DeleteOutlineOutlined fontSize="small" />,
          disabled: !contextAsset || isRootSkill,
          tone: 'danger',
          onSelect: () =>
            options.deleteTarget({
              assetId: contextAsset?.id
            })
        }
      ]
    }
  ]
}

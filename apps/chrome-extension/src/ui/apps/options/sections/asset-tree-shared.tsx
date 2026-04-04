import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import {
  Box,
  ButtonBase,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'

export type AssetFileTreeNode =
  | {
      kind: 'folder'
      id: string
      path: string
      label: string
      children: AssetFileTreeNode[]
    }
  | {
      kind: 'file'
      id: string
      assetId: string
      path: string
      label: string
      searchText: string
    }

export type AssetScopeEntry = {
  itemId: string
  kind: 'folder' | 'file'
  title: string
  subtitle?: string
}

export type AssetBreadcrumb = {
  itemId: string
  label: string
}

export function AssetTreeLabel({
  action,
  count,
  dropActive = false,
  label,
  searchTerm
}: {
  action?: ReactNode
  count: number
  dropActive?: boolean
  label: string
  searchTerm?: string
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        bgcolor: dropActive ? 'action.hover' : undefined
      }}
    >
      <FolderOutlined fontSize="small" />
      <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: 600 }}>
        {renderHighlightedText(label, searchTerm)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {count}
      </Typography>
      {action ? <Box className="asset-tree-actions">{action}</Box> : null}
    </Box>
  )
}

export function AssetTreeLeaf({
  action,
  dragging = false,
  dropActive = false,
  icon,
  label
}: {
  action?: ReactNode
  dragging?: boolean
  dropActive?: boolean
  icon: ReactNode
  label: ReactNode
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        opacity: dragging ? 0.45 : 1,
        bgcolor: dropActive ? 'action.hover' : undefined
      }}
    >
      {icon}
      <Box sx={{ flex: 1, minWidth: 0 }}>{label}</Box>
      {action ? <Box className="asset-tree-actions">{action}</Box> : null}
    </Box>
  )
}

export function AssetTreeAction({
  children,
  label,
  onClick
}: {
  children: ReactNode
  label: string
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        size="small"
        onClick={(event) => {
          event.stopPropagation()
          onClick(event)
        }}
        sx={{
          width: 20,
          height: 20,
          color: 'text.secondary'
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}

export function AssetTreeRenameField({
  error,
  onCancel,
  onChange,
  onCommit,
  value
}: {
  error: boolean
  onCancel: () => void
  onChange: (value: string) => void
  onCommit: () => void
  value: string
}) {
  return (
    <TextField
      autoFocus
      error={error}
      size="small"
      variant="standard"
      value={value}
      onBlur={() => {
        if (error) {
          onCancel()
          return
        }

        onCommit()
      }}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()

        if (event.key === 'Enter') {
          event.preventDefault()
          if (!error) {
            onCommit()
          }
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
      sx={{
        '& .MuiInputBase-root': {
          fontSize: 14
        },
        minWidth: 0
      }}
    />
  )
}

export function AssetContextHeader({
  breadcrumbs,
  onOpenItem,
  path,
  title
}: {
  breadcrumbs?: AssetBreadcrumb[]
  onOpenItem?: (itemId: string) => void
  path?: string
  title: string
}) {
  return (
    <Stack spacing={0.25} sx={{ pb: 1 }}>
      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
            minWidth: 0
          }}
        >
          {breadcrumbs.map((breadcrumb, index) => (
            <Box
              key={breadcrumb.itemId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0
              }}
            >
              {index > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  /
                </Typography>
              ) : null}
              {onOpenItem ? (
                <ButtonBase
                  onClick={() => onOpenItem(breadcrumb.itemId)}
                  sx={{
                    minWidth: 0,
                    color: 'text.secondary',
                    justifyContent: 'flex-start',
                    borderRadius: 0.5,
                    px: 0.25
                  }}
                >
                  <Typography variant="caption" noWrap>
                    {breadcrumb.label}
                  </Typography>
                </ButtonBase>
              ) : (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {breadcrumb.label}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      ) : path ? (
        <Typography variant="caption" color="text.secondary" noWrap>
          {path}
        </Typography>
      ) : null}
    </Stack>
  )
}

export function AssetEmptyState({
  actions,
  label,
  minHeight = 360
}: {
  actions?: ReactNode
  label: string
  minHeight?: number
}) {
  return (
    <Stack
      spacing={1.25}
      justifyContent="center"
      alignItems="flex-start"
      sx={{
        minHeight,
        px: 0,
        py: 1
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {actions}
    </Stack>
  )
}

export function AssetScopePanel({
  breadcrumbs,
  emptyLabel,
  entries,
  onOpenItem,
  openParentLabel,
  parentItemId,
  path,
  searchTerm,
  title
}: {
  breadcrumbs?: AssetBreadcrumb[]
  emptyLabel: string
  entries: AssetScopeEntry[]
  onOpenItem: (itemId: string) => void
  openParentLabel: string
  parentItemId?: string
  path?: string
  searchTerm?: string
  title: string
}) {
  if (entries.length === 0) {
    return (
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <AssetContextHeader
          breadcrumbs={breadcrumbs}
          onOpenItem={onOpenItem}
          path={path}
          title={title}
        />
        {parentItemId ? (
          <AssetScopeParentEntry
            itemId={parentItemId}
            label={openParentLabel}
            onOpenItem={onOpenItem}
          />
        ) : null}
        <AssetEmptyState label={emptyLabel} />
      </Stack>
    )
  }

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
      <AssetContextHeader
        breadcrumbs={breadcrumbs}
        onOpenItem={onOpenItem}
        path={path}
        title={title}
      />
      <Stack spacing={0}>
        {parentItemId ? (
          <AssetScopeParentEntry
            itemId={parentItemId}
            label={openParentLabel}
            onOpenItem={onOpenItem}
          />
        ) : null}
        {entries.map((item) => (
          <ButtonBase
            key={item.itemId}
            onClick={() => onOpenItem(item.itemId)}
            sx={{
              alignItems: 'stretch',
              borderBottom: '1px solid',
              borderColor: 'divider',
              justifyContent: 'flex-start',
              px: 0,
              py: 1,
              textAlign: 'left',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
                width: '100%'
              }}
            >
              {item.kind === 'folder' ? (
                <FolderOutlined fontSize="small" color="action" />
              ) : (
                <DescriptionOutlined fontSize="small" color="action" />
              )}
              <Stack spacing={0.25} sx={{ minWidth: 0, width: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {renderHighlightedText(item.title, searchTerm)}
                </Typography>
                {item.subtitle ? (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {renderHighlightedText(item.subtitle, searchTerm)}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </ButtonBase>
        ))}
      </Stack>
    </Stack>
  )
}

export function renderHighlightedText(text: string, searchTerm?: string) {
  const needle = searchTerm?.trim()

  if (!needle) {
    return text
  }

  const lowerText = text.toLocaleLowerCase()
  const lowerNeedle = needle.toLocaleLowerCase()

  if (!lowerText.includes(lowerNeedle)) {
    return text
  }

  const segments: ReactNode[] = []
  let cursor = 0
  let matchIndex = lowerText.indexOf(lowerNeedle, cursor)

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      segments.push(text.slice(cursor, matchIndex))
    }

    const endIndex = matchIndex + needle.length
    segments.push(
      <Box
        component="span"
        key={`${matchIndex}-${endIndex}`}
        sx={{
          bgcolor: 'action.selected',
          borderRadius: 0.5,
          px: 0.25
        }}
      >
        {text.slice(matchIndex, endIndex)}
      </Box>
    )
    cursor = endIndex
    matchIndex = lowerText.indexOf(lowerNeedle, cursor)
  }

  if (cursor < text.length) {
    segments.push(text.slice(cursor))
  }

  return segments
}

export function buildAssetBreadcrumbs({
  folderItemPrefix,
  path,
  rootItemId,
  rootLabel
}: {
  folderItemPrefix: string
  path: string | undefined
  rootItemId: string
  rootLabel: string
}): AssetBreadcrumb[] | undefined {
  if (!path) {
    return undefined
  }

  return [
    {
      itemId: rootItemId,
      label: rootLabel
    },
    ...listAncestorFolders(path).map((folderPath) => ({
      itemId: `${folderItemPrefix}:${folderPath}`,
      label: basename(folderPath)
    }))
  ]
}

export function getParentScopeItemId({
  folderItemPrefix,
  path,
  rootItemId
}: {
  folderItemPrefix: string
  path: string | undefined
  rootItemId: string
}): string | undefined {
  if (!path) {
    return undefined
  }

  const parentPath = dirname(path)
  return parentPath ? `${folderItemPrefix}:${parentPath}` : rootItemId
}

export function getAssetFolderChildren(
  nodes: AssetFileTreeNode[],
  folderPath: string | undefined
): AssetFileTreeNode[] {
  if (!folderPath) {
    return nodes
  }

  for (const node of nodes) {
    if (node.kind !== 'folder') {
      continue
    }

    if (node.path === folderPath) {
      return node.children
    }

    const nested = getAssetFolderChildren(node.children, folderPath)

    if (nested.length > 0) {
      return nested
    }
  }

  return []
}

export function listAncestorFolders(path: string): string[] {
  const segments = splitAssetPath(path)
  const folders: string[] = []

  for (let index = 1; index < segments.length; index += 1) {
    folders.push(segments.slice(0, index).join('/'))
  }

  return folders
}

export function dirname(path: string): string {
  const segments = splitAssetPath(path)
  return segments.slice(0, -1).join('/')
}

export function basename(path: string): string {
  const segments = splitAssetPath(path)
  return segments.at(-1) ?? ''
}

export function collectAssetItemIds(
  prefix: string,
  nodes: AssetFileTreeNode[]
): string[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder'
      ? [
          `${prefix}-folder:${node.path}`,
          ...collectAssetItemIds(prefix, node.children)
        ]
      : [`${prefix}:${node.assetId}`]
  )
}

export function collectAssetFolderPaths(nodes: AssetFileTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder'
      ? [node.path, ...collectAssetFolderPaths(node.children)]
      : []
  )
}

export function countAssetFiles(nodes: AssetFileTreeNode[]): number {
  return nodes.reduce(
    (count, node) =>
      count + (node.kind === 'folder' ? countAssetFiles(node.children) : 1),
    0
  )
}

export function findFirstAssetTreeItemId(
  prefix: string,
  nodes: AssetFileTreeNode[]
): string | undefined {
  for (const node of nodes) {
    if (node.kind === 'folder') {
      return `${prefix}-folder:${node.path}`
    }

    return `${prefix}:${node.assetId}`
  }

  return undefined
}

export function buildAssetFileTree<
  TItem extends {
    id: string
    path: string
    name: string
  }
>(
  items: TItem[],
  searchText: (item: TItem) => string
): AssetFileTreeNode[] {
  const root: AssetFileTreeNode[] = []
  const folderNodes = new Map<
    string,
    Extract<AssetFileTreeNode, { kind: 'folder' }>
  >()

  for (const folderPath of listAssetFolders(items)) {
    const segments = splitAssetPath(folderPath)

    if (segments.length === 0) {
      continue
    }

    let parentChildren = root
    let currentPath = ''

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      let folder = folderNodes.get(currentPath)

      if (!folder) {
        folder = {
          kind: 'folder',
          id: `folder:${currentPath}`,
          path: currentPath,
          label: segment,
          children: []
        }
        folderNodes.set(currentPath, folder)
        parentChildren.push(folder)
      }

      parentChildren = folder.children
    }
  }

  for (const item of [...items].sort((left, right) =>
    left.path.localeCompare(right.path)
  )) {
    const segments = splitAssetPath(item.path)

    if (segments.length === 0) {
      continue
    }

    let parentChildren = root
    let currentPath = ''

    for (const segment of segments.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      let folder = folderNodes.get(currentPath)

      if (!folder) {
        folder = {
          kind: 'folder',
          id: `folder:${currentPath}`,
          path: currentPath,
          label: segment,
          children: []
        }
        folderNodes.set(currentPath, folder)
        parentChildren.push(folder)
      }

      parentChildren = folder.children
    }

    parentChildren.push({
      kind: 'file',
      id: `file:${item.id}`,
      assetId: item.id,
      path: item.path,
      label: segments.at(-1) ?? item.name,
      searchText: searchText(item)
    })
  }

  return sortAssetFileTree(root)
}

export function filterAssetFileTree(
  nodes: AssetFileTreeNode[],
  searchQuery: string
): AssetFileTreeNode[] {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  if (!normalizedQuery) {
    return nodes
  }

  return nodes.reduce<AssetFileTreeNode[]>((result, node) => {
    const matchesNode =
      node.kind === 'folder'
        ? `${node.path} ${node.label}`.toLowerCase().includes(normalizedQuery)
        : `${node.path} ${node.label} ${node.searchText}`
            .toLowerCase()
            .includes(normalizedQuery)

    if (node.kind === 'folder') {
      if (matchesNode) {
        result.push(node)
        return result
      }

      const filteredChildren = filterAssetFileTree(
        node.children,
        normalizedQuery
      )

      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren })
      }

      return result
    }

    if (matchesNode) {
      result.push(node)
    }

    return result
  }, [])
}

function AssetScopeParentEntry({
  itemId,
  label,
  onOpenItem
}: {
  itemId: string
  label: string
  onOpenItem: (itemId: string) => void
}) {
  return (
    <ButtonBase
      aria-label={label}
      onClick={() => onOpenItem(itemId)}
      sx={{
        alignItems: 'stretch',
        borderBottom: '1px solid',
        borderColor: 'divider',
        justifyContent: 'flex-start',
        px: 0,
        py: 1,
        textAlign: 'left',
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          minWidth: 0,
          width: '100%'
        }}
      >
        <ArrowBackOutlined fontSize="small" color="action" />
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          ..
        </Typography>
      </Box>
    </ButtonBase>
  )
}

function listAssetFolders<TItem extends { path: string }>(items: TItem[]): string[] {
  return [
    ...new Set(items.flatMap((item) => listAncestorFolders(item.path)))
  ].sort((left, right) => left.localeCompare(right))
}

function sortAssetFileTree(nodes: AssetFileTreeNode[]): AssetFileTreeNode[] {
  return [...nodes]
    .map((node) =>
      node.kind === 'folder'
        ? {
            ...node,
            children: sortAssetFileTree(node.children)
          }
        : node
    )
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'folder' ? -1 : 1
      }

      return left.label.localeCompare(right.label)
    })
}

function splitAssetPath(path: string): string[] {
  return path
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_.]+|[-_.]+$/g, '')
    )
    .filter(Boolean)
}

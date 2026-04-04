import { Box } from '@mui/material'
import type { ReactNode } from 'react'

import type { AssetBreadcrumb, AssetFileTreeNode } from './types.js'

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
  searchText: (item: TItem) => string,
  extraFolderPaths: string[] = []
): AssetFileTreeNode[] {
  const root: AssetFileTreeNode[] = []
  const folderNodes = new Map<
    string,
    Extract<AssetFileTreeNode, { kind: 'folder' }>
  >()

  for (const folderPath of listAssetFolders(items, extraFolderPaths)) {
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

function listAssetFolders<TItem extends { path: string }>(
  items: TItem[],
  extraFolderPaths: string[] = []
): string[] {
  return [
    ...new Set([
      ...items.flatMap((item) => listAncestorFolders(item.path)),
      ...extraFolderPaths.flatMap((path) => [path, ...listAncestorFolders(path)])
    ])
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
      const leftPriority = getAssetTreeLabelPriority(left.label)
      const rightPriority = getAssetTreeLabelPriority(right.label)

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }

      if (left.kind !== right.kind) {
        return left.kind === 'folder' ? -1 : 1
      }

      return left.label.localeCompare(right.label)
    })
}

function getAssetTreeLabelPriority(label: string): number {
  if (label === '.ai') {
    return 0
  }

  if (label === 'SKILL.md' || label === 'skill.md') {
    return 1
  }

  return 2
}

function splitAssetPath(path: string): string[] {
  return path
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
    )
    .filter(Boolean)
}

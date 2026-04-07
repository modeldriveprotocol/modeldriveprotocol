import type { AssetFileTreeNode } from '../types.js'
import { listAncestorFolders, splitAssetPath } from './paths.js'

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
    ensureFolderPath(root, folderNodes, splitAssetPath(folderPath))
  }

  for (const item of [...items].sort((left, right) =>
    left.path.localeCompare(right.path)
  )) {
    const segments = splitAssetPath(item.path)

    if (segments.length === 0) {
      continue
    }

    const parentChildren = ensureFolderPath(
      root,
      folderNodes,
      segments.slice(0, -1)
    )

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

function ensureFolderPath(
  root: AssetFileTreeNode[],
  folderNodes: Map<string, Extract<AssetFileTreeNode, { kind: 'folder' }>>,
  segments: string[]
): AssetFileTreeNode[] {
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

  return parentChildren
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

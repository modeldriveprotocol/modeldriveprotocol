import type { AssetBreadcrumb, AssetFileTreeNode } from '../types.js'
import { basename, dirname, listAncestorFolders } from './paths.js'

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

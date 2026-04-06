import type { AssetFileTreeNode } from '../types.js'

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

export function collectAssetSubtreeItemIds(
  prefix: string,
  nodes: AssetFileTreeNode[],
  folderPath: string,
  options: {
    includeFolder?: boolean
  } = {}
): string[] {
  for (const node of nodes) {
    if (node.kind !== 'folder') {
      continue
    }

    if (node.path === folderPath) {
      return [
        ...(options.includeFolder ? [`${prefix}-folder:${node.path}`] : []),
        ...collectAssetItemIds(prefix, node.children)
      ]
    }

    const nestedItemIds = collectAssetSubtreeItemIds(
      prefix,
      node.children,
      folderPath,
      options
    )

    if (nestedItemIds.length > 0) {
      return nestedItemIds
    }
  }

  return []
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

export function splitAssetPath(path: string): string[] {
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

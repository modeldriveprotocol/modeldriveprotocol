import type {
  RouteClientConfig,
  RouteClientRecording,
  RouteExposeAsset,
  RouteSkillEntry,
  RouteSkillFolder
} from '#~/shared/config.js'
import { isRootRouteSkillPath } from '#~/shared/config.js'
import { createLocalId } from '../../types.js'
import {
  basename,
  createUniquePath,
  createUniquePathForMove,
  createUniqueSkillPath,
  replacePathPrefix
} from './asset-helpers.js'

export function createRouteCodeAsset(
  existingPaths: string[],
  parentPath: string
): RouteClientRecording {
  const now = new Date().toISOString()

  return {
    kind: 'flow',
    id: createLocalId('flow'),
    enabled: true,
    path: createUniquePath(existingPaths, parentPath, 'code'),
    name: 'Code',
    description: '',
    method: 'POST',
    mode: 'script',
    createdAt: now,
    updatedAt: now,
    capturedFeatures: [],
    steps: [],
    scriptSource: 'return {\n  ok: true\n}\n'
  }
}

export function createRouteMarkdownAsset(
  existingPaths: string[],
  parentPath: string,
  title: string
): RouteSkillEntry {
  return {
    kind: 'skill',
    id: createLocalId('skill'),
    enabled: true,
    path: createUniqueSkillPath(existingPaths, parentPath),
    metadata: {
      title,
      summary: '',
      queryParameters: [],
      headerParameters: []
    },
    content: ''
  }
}

export function createRouteFolderAsset(
  folderPaths: string[],
  parentPath: string
): RouteSkillFolder {
  return {
    kind: 'folder',
    id: createLocalId('folder'),
    path: createUniquePath(folderPaths, parentPath, 'folder')
  }
}

export function moveRouteAssetToFolder(
  client: RouteClientConfig,
  assetId: string,
  folderPath: string
): RouteExposeAsset[] | undefined {
  const asset = client.exposes.find((item) => item.id === assetId)

  if (!asset || (asset.kind === 'skill' && isRootRouteSkillPath(asset.path))) {
    return undefined
  }

  const nextPath = createUniquePathForMove(
    client.exposes.filter((item) => item.id !== assetId).map((item) => item.path),
    folderPath,
    basename(asset.path)
  )

  if (nextPath === asset.path) {
    return undefined
  }

  return client.exposes.map((item) =>
    item.id === assetId ? { ...item, path: nextPath } : item
  )
}

export function moveRouteFolderToFolder(
  client: RouteClientConfig,
  folderPath: string,
  targetFolderPath: string
): { nextExposes: RouteExposeAsset[]; nextFolderPath: string } | undefined {
  if (
    folderPath === targetFolderPath ||
    targetFolderPath.startsWith(`${folderPath}/`)
  ) {
    return undefined
  }

  const nextFolderPath = createUniquePathForMove(
    client.exposes
      .map((item) => item.path)
      .filter((path) => path !== folderPath && !path.startsWith(`${folderPath}/`)),
    targetFolderPath,
    basename(folderPath)
  )

  return {
    nextExposes: client.exposes.map((item) => {
      if (item.path === folderPath || item.path.startsWith(`${folderPath}/`)) {
        return {
          ...item,
          path: replacePathPrefix(item.path, folderPath, nextFolderPath)
        }
      }

      return item
    }),
    nextFolderPath
  }
}

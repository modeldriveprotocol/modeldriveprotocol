import type { AssetFileTreeNode } from './types.js'

export type AssetEnabledState = 'enabled' | 'disabled' | 'mixed'

export function resolveAssetEnabledState(
  assetId: string,
  assetEnabled: ReadonlyMap<string, boolean>
): AssetEnabledState {
  return assetEnabled.get(assetId) ? 'enabled' : 'disabled'
}

export function resolveFolderEnabledState(
  node: AssetFileTreeNode,
  assetEnabled: ReadonlyMap<string, boolean>
): AssetEnabledState {
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

export function collectFolderAssetIds<T extends { assetId: string; path: string }>(
  items: T[],
  folderPath: string
): string[] {
  return items
    .filter(
      (item) => item.path === folderPath || item.path.startsWith(`${folderPath}/`)
    )
    .map((item) => item.assetId)
}

export function resolveNextEnabledValue(
  assetIds: string[],
  assetEnabled: ReadonlyMap<string, boolean>
): boolean {
  return assetIds.some((assetId) => !assetEnabled.get(assetId))
}

export function applyEnabledValue<T extends { id: string }>(
  assets: T[],
  assetIds: string[],
  enabled: boolean
): T[] {
  if (assetIds.length === 0) {
    return assets
  }

  const assetIdSet = new Set(assetIds)

  return assets.map((asset) => {
    if (!assetIdSet.has(asset.id) || !('enabled' in asset)) {
      return asset
    }

    return {
      ...asset,
      enabled
    }
  })
}

function collectLeafEnabledStates(
  node: AssetFileTreeNode,
  assetEnabled: ReadonlyMap<string, boolean>
): boolean[] {
  if (node.kind === 'file') {
    return [assetEnabled.get(node.assetId) ?? true]
  }

  return node.children.flatMap((child) =>
    collectLeafEnabledStates(child, assetEnabled)
  )
}

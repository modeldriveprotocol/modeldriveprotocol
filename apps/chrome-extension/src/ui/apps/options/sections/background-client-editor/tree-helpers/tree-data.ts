import {
  getBackgroundExposeDefinition,
  type BackgroundExposeAsset
} from '#~/shared/config.js'
import {
  buildAssetFileTree,
  type AssetFileTreeNode
} from '../../asset-tree-shared.js'
import { getBackgroundDisplayPath } from './path-utils.js'

export function buildBackgroundTree(
  exposes: BackgroundExposeAsset[],
  sharedDisplayPrefix: string | undefined
): AssetFileTreeNode[] {
  return buildAssetFileTree(
    exposes.map((asset) => ({
      ...asset,
      path: getBackgroundDisplayPath(asset.path, sharedDisplayPrefix),
      name: getBackgroundDisplayPath(asset.path, sharedDisplayPrefix)
    })),
    (asset) => {
      const definition = getBackgroundExposeDefinition(asset.id)

      return [
        asset.path,
        asset.description,
        definition?.method,
        definition?.sourceKind,
        definition?.group
      ]
        .filter(Boolean)
        .join(' ')
    }
  )
}

export function getPreferredBackgroundAssetId(
  exposes: BackgroundExposeAsset[]
): BackgroundExposeAsset['id'] | undefined {
  return (
    exposes.find((asset) => asset.path.endsWith('/SKILL.md'))?.id ??
    exposes.find((asset) => asset.path.endsWith('SKILL.md'))?.id ??
    exposes[0]?.id
  )
}

export function resolveInitialBackgroundAssetId(
  exposes: BackgroundExposeAsset[],
  initialAssetPath: string | undefined
): BackgroundExposeAsset['id'] | undefined {
  if (initialAssetPath) {
    const matchedAsset = exposes.find((asset) => asset.path === initialAssetPath)

    if (matchedAsset) {
      return matchedAsset.id
    }
  }

  return getPreferredBackgroundAssetId(exposes)
}

import type { BackgroundExposeAsset } from '#~/shared/config.js'
import type {
  AssetContextMenuState,
  AssetContextMenuTarget
} from '../asset-tree-shared.js'

export type BackgroundTreePrefix = 'asset'

export type BackgroundRenameTarget =
  | {
      kind: 'asset'
      assetId: BackgroundExposeAsset['id']
      path: string
      value: string
    }
  | {
      kind: 'folder'
      path: string
      value: string
    }

export type BackgroundContextMenuState =
  AssetContextMenuState<BackgroundExposeAsset['id']>

export type BackgroundContextMenuTarget =
  AssetContextMenuTarget<BackgroundExposeAsset['id']>

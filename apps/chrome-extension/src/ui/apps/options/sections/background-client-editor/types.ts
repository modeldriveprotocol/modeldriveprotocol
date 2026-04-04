import type { BackgroundExposeAsset } from '#~/shared/config.js'

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

export type BackgroundContextMenuState = {
  kind: 'asset' | 'folder' | 'root'
  assetId?: BackgroundExposeAsset['id']
  folderPath?: string
  mouseX: number
  mouseY: number
}

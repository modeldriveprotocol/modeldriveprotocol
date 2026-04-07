import type {
  AssetContextMenuState,
  AssetContextMenuTarget,
  AssetMutationTarget
} from '../asset-tree-shared.js'

export type ClientTreeItem =
  | {
      id: string
      kind: 'flow' | 'resource' | 'skill'
      path: string
      name: string
      enabled: boolean
      searchText: string
      assetId: string
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    }

export type TreeContextMenuState = AssetContextMenuState<string> & {
  folderPath: string
}

export type TreeContextMenuTarget = AssetContextMenuTarget<string> & {
  folderPath: string
}

export type TreeMutationTarget = AssetMutationTarget<string>

export type RouteRenameTarget =
  | {
      kind: 'asset'
      assetId: string
      path: string
      value: string
    }
  | {
      kind: 'folder'
      path: string
      value: string
    }

export type DragState =
  | {
      kind: 'asset'
      assetId: string
      path: string
    }
  | {
      kind: 'folder'
      path: string
    }

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

export type TreeContextMenuState = {
  kind: 'asset' | 'folder' | 'root'
  assetId?: string
  folderPath: string
  mouseX: number
  mouseY: number
}

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

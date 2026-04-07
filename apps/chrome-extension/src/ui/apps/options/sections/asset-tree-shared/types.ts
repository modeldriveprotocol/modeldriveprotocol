export type AssetFileTreeNode =
  | {
      kind: 'folder'
      id: string
      path: string
      label: string
      children: AssetFileTreeNode[]
    }
  | {
      kind: 'file'
      id: string
      assetId: string
      path: string
      label: string
      searchText: string
    }

export type AssetScopeEntry = {
  itemId: string
  kind: 'folder' | 'file'
  title: string
  subtitle?: string
}

export type AssetBreadcrumb = {
  itemId: string
  label: string
}

export type AssetPathEntry<AssetId extends string = string> = {
  assetId: AssetId
  path: string
}

export type AssetContextMenuTarget<AssetId extends string = string> = {
  kind: 'asset' | 'folder' | 'root'
  assetId?: AssetId
  folderPath?: string
}

export type AssetMutationTarget<AssetId extends string = string> = {
  assetId?: AssetId
  folderPath?: string
}

export type AssetContextMenuState<AssetId extends string = string> =
  AssetContextMenuTarget<AssetId> & {
    mouseX: number
    mouseY: number
  }

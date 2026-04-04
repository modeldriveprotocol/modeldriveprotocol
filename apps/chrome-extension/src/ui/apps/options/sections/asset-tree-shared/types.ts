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

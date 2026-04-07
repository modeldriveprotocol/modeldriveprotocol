import UnfoldLessOutlined from '@mui/icons-material/UnfoldLessOutlined'
import UnfoldMoreOutlined from '@mui/icons-material/UnfoldMoreOutlined'
import type { ReactNode } from 'react'

export type AssetTreeToolbarAction = {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
}

export function createAssetTreeSearchActions(labels: {
  expandAll: string
  collapseAll: string
}, handlers: {
  onExpandAll: () => void
  onCollapseAll: () => void
}): AssetTreeToolbarAction[] {
  return [
    {
      key: 'expand-all',
      label: labels.expandAll,
      icon: <UnfoldMoreOutlined fontSize="small" />,
      onClick: handlers.onExpandAll
    },
    {
      key: 'collapse-all',
      label: labels.collapseAll,
      icon: <UnfoldLessOutlined fontSize="small" />,
      onClick: handlers.onCollapseAll
    }
  ]
}

import type { SxProps, Theme } from '@mui/material/styles'

export const sharedAssetTreeSx: SxProps<Theme> = {
  minWidth: 0,
  px: 0,
  '& .MuiTreeItem-content': {
    minHeight: 32,
    pr: 1.25,
    borderRadius: 0,
    width: '100%',
    cursor: 'pointer'
  },
  '& .MuiTreeItem-content.Mui-selected, & .MuiTreeItem-content.Mui-selected:hover': {
    bgcolor: 'action.selected'
  },
  '& > .MuiTreeItem-root > .MuiTreeItem-content': {
    pl: 0
  },
  '& .MuiTreeItem-content.Mui-focused:not(.Mui-selected)': {
    bgcolor: 'transparent'
  },
  '& .MuiTreeItem-label': {
    flex: 1,
    minWidth: 0
  }
}

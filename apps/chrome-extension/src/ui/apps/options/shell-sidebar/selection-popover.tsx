import { Popover } from '@mui/material'
import type { ReactNode } from 'react'

export function SidebarSelectionPopover({
  anchorEl,
  children,
  onClose
}: {
  anchorEl: HTMLElement | null
  children: ReactNode
  onClose: () => void
}) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
      transformOrigin={{ vertical: 'center', horizontal: 'left' }}
      slotProps={{ paper: { sx: { ml: 1, width: 220, borderRadius: '4px' } } }}
    >
      {children}
    </Popover>
  )
}

import { Collapse, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material'
import type { ReactNode } from 'react'

import {
  OPTIONS_SIDEBAR_COLLAPSED_PADDING_X,
  OPTIONS_SIDEBAR_EXPANDED_PADDING_X,
  OPTIONS_SIDEBAR_ITEM_SIZE
} from '../layout.js'

export function SidebarNavItem({
  collapsed,
  icon,
  label,
  onClick,
  selected
}: {
  collapsed: boolean
  icon: ReactNode
  label: string
  onClick: () => void
  selected: boolean
}) {
  return (
    <ListItem disablePadding sx={{ mb: 0.25 }}>
      <Tooltip title={label} placement="right">
        <ListItemButton
          selected={selected}
          onClick={onClick}
          sx={{
            minHeight: OPTIONS_SIDEBAR_ITEM_SIZE,
            px: collapsed
              ? OPTIONS_SIDEBAR_COLLAPSED_PADDING_X
              : OPTIONS_SIDEBAR_EXPANDED_PADDING_X,
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 1.5
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: collapsed ? 'auto' : 32,
              color: selected ? 'primary.main' : 'text.secondary'
            }}
          >
            {icon}
          </ListItemIcon>
          <Collapse in={!collapsed} orientation="horizontal" collapsedSize={0} timeout={180}>
            <ListItemText
              primary={label}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
            />
          </Collapse>
        </ListItemButton>
      </Tooltip>
    </ListItem>
  )
}

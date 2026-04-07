import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography
} from '@mui/material'
import type { ReactNode } from 'react'

export type ScriptedAssetContextMenuSection = {
  key: string
  title: string
  items: Array<{
    key: string
    label: string
    icon?: ReactNode
    disabled?: boolean
    tone?: 'default' | 'danger'
    onSelect: () => void
  }>
}

export function ScriptedAssetContextMenu({
  anchorPosition,
  onClose,
  open,
  sections
}: {
  anchorPosition?: { left: number; top: number }
  onClose: () => void
  open: boolean
  sections: ScriptedAssetContextMenuSection[]
}) {
  const visibleSections = sections.filter((section) => section.items.length > 0)

  return (
    <Menu
      anchorPosition={anchorPosition}
      anchorReference="anchorPosition"
      MenuListProps={{
        disablePadding: true,
        sx: { py: 0 }
      }}
      onClose={onClose}
      open={open}
      PaperProps={{
        sx: {
          py: 0,
          minWidth: 220
        }
      }}
    >
      {visibleSections.map((section, index) => (
        <Box key={section.key}>
          {index > 0 ? <Divider /> : null}
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              px: 1.5,
              pt: 0.75,
              pb: 0.25,
              color: 'text.secondary',
              lineHeight: 1.6
            }}
          >
            {section.title}
          </Typography>
          {section.items.map((item) => (
            <MenuItem
              key={item.key}
              dense
              disabled={item.disabled}
              onClick={() => {
                onClose()
                item.onSelect()
              }}
              sx={{
                minHeight: 34,
                py: 0.75,
                color:
                  item.tone === 'danger' && !item.disabled
                    ? 'error.main'
                    : undefined
              }}
            >
              {item.icon ? <ListItemIcon>{item.icon}</ListItemIcon> : null}
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          ))}
        </Box>
      ))}
    </Menu>
  )
}

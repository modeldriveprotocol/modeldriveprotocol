import FolderOutlined from '@mui/icons-material/FolderOutlined'
import { Box, Typography } from '@mui/material'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'

import { renderHighlightedText } from '../helpers.js'

function AssetTreeActionSlot({
  action
}: {
  action?: ReactNode
}) {
  if (!action) {
    return null
  }

  return (
    <Box
      className="asset-tree-actions"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        pointerEvents: 'none',
        '& > *': {
          pointerEvents: 'auto'
        }
      }}
    >
      {action}
    </Box>
  )
}

function AssetTreeInteractiveRow({
  action,
  children,
  dragging = false,
  dropActive = false,
  onClick
}: {
  action?: ReactNode
  children: ReactNode
  dragging?: boolean
  dropActive?: boolean
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        width: '100%',
        opacity: dragging ? 0.45 : 1,
        bgcolor: dropActive ? 'action.hover' : undefined
      }}
    >
      <Box
        onMouseDown={(event) => {
          if (event.button === 2) {
            event.preventDefault()
          }
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onClick?.(event)
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          minWidth: 0,
          flex: 1
        }}
      >
        {children}
      </Box>
      <AssetTreeActionSlot action={action} />
    </Box>
  )
}

export function AssetTreeLabel({
  action,
  dropActive = false,
  label,
  onClick,
  selected: _selected = false,
  searchTerm
}: {
  action?: ReactNode
  dropActive?: boolean
  label: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void
  selected?: boolean
  searchTerm?: string
}) {
  return (
    <AssetTreeInteractiveRow
      action={action}
      dropActive={dropActive}
      onClick={onClick}
    >
      <FolderOutlined fontSize="small" />
      {typeof label === 'string' ? (
        <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: 600 }}>
          {renderHighlightedText(label, searchTerm)}
        </Typography>
      ) : (
        <Box sx={{ flex: 1, minWidth: 0 }}>{label}</Box>
      )}
    </AssetTreeInteractiveRow>
  )
}

export function AssetTreeLeaf({
  action,
  dragging = false,
  dropActive = false,
  icon,
  label,
  onClick,
  selected: _selected = false
}: {
  action?: ReactNode
  dragging?: boolean
  dropActive?: boolean
  icon: ReactNode
  label: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void
  selected?: boolean
}) {
  return (
    <AssetTreeInteractiveRow
      action={action}
      dragging={dragging}
      dropActive={dropActive}
      onClick={onClick}
    >
      {icon}
      <Box sx={{ flex: 1, minWidth: 0 }}>{label}</Box>
    </AssetTreeInteractiveRow>
  )
}

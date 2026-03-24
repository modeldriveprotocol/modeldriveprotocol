import { IconButton, Tooltip } from '@mui/material'
import type { ReactNode } from 'react'

export function ActionIcon({
  children,
  disabled,
  emphasis,
  label,
  onClick
}: {
  children: ReactNode
  disabled?: boolean
  emphasis?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          aria-label={label}
          size="small"
          onClick={onClick}
          disabled={disabled}
          sx={
            emphasis
              ? {
                  bgcolor: 'primary.main',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    opacity: 0.92
                  }
                }
              : undefined
          }
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}

import { IconButton, Tooltip } from '@mui/material'
import type { ReactNode } from 'react'

export function ActionIcon({
  children,
  disabled,
  emphasis,
  label,
  onClick,
  size = 32
}: {
  children: ReactNode
  disabled?: boolean
  emphasis?: boolean
  label: string
  onClick: () => void
  size?: number
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
                  width: size,
                  height: size,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    opacity: 0.92
                  }
                }
              : {
                  width: size,
                  height: size
                }
          }
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}

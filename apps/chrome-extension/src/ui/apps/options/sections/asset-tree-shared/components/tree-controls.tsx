import { IconButton, TextField, Tooltip } from '@mui/material'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'

export function AssetTreeAction({
  children,
  label,
  onClick
}: {
  children: ReactNode
  label: string
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        size="small"
        onClick={(event) => {
          event.stopPropagation()
          onClick(event)
        }}
        sx={{
          width: 20,
          height: 20,
          color: 'text.secondary'
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}

export function AssetTreeRenameField({
  error,
  onCancel,
  onChange,
  onCommit,
  value
}: {
  error: boolean
  onCancel: () => void
  onChange: (value: string) => void
  onCommit: () => void
  value: string
}) {
  return (
    <TextField
      autoFocus
      error={error}
      size="small"
      variant="standard"
      value={value}
      onBlur={() => {
        if (error) {
          onCancel()
          return
        }

        onCommit()
      }}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()

        if (event.key === 'Enter') {
          event.preventDefault()
          if (!error) {
            onCommit()
          }
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
      sx={{
        '& .MuiInputBase-root': {
          fontSize: 14
        },
        minWidth: 0
      }}
    />
  )
}

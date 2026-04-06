import { Box, MenuItem, TextField } from '@mui/material'
import { alpha, useTheme, type Theme, type SxProps, type Theme as MuiTheme } from '@mui/material/styles'

import type { AssetEnabledState } from '../asset-tree-shared.js'

export function ScriptedAssetMethodField({
  label,
  method,
  sx,
  onChange
}: {
  label: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  sx?: SxProps<MuiTheme>
  onChange: (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') => void
}) {
  return (
    <TextField
      select
      size="small"
      label={label}
      sx={{
        ...sx,
        '& .MuiInputLabel-root': {
          fontSize: 13
        },
        '& .MuiOutlinedInput-root': {
          minHeight: 34,
          borderRadius: 1
        },
        '& .MuiSelect-select': {
          fontSize: 13,
          py: 0.75
        },
        '& .MuiSvgIcon-root': {
          fontSize: 18
        }
      }}
      value={method}
      onChange={(event) =>
        onChange(
          event.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
        )
      }
    >
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="GET">GET</MenuItem>
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="POST">POST</MenuItem>
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="PUT">PUT</MenuItem>
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="PATCH">PATCH</MenuItem>
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="DELETE">DELETE</MenuItem>
    </TextField>
  )
}

export function ScriptedAssetEnabledButton({
  disabled = false,
  onClick,
  state
}: {
  disabled?: boolean
  onClick: () => void
  state: AssetEnabledState
}) {
  const theme = useTheme()
  const tone = getEnabledButtonTone(theme, state)

  function trigger() {
    if (!disabled) {
      onClick()
    }
  }

  function markMuiEventHandled(event: {
    defaultMuiPrevented?: boolean
    preventDefault: () => void
    stopPropagation: () => void
  }) {
    event.preventDefault()
    event.stopPropagation()
    event.defaultMuiPrevented = true
  }

  return (
    <Box
      aria-label={
        state === 'enabled'
          ? 'Disable'
          : state === 'disabled'
            ? 'Enable'
            : 'Enable all'
      }
      component="span"
      onMouseDownCapture={(event) => {
        if (event.button === 0) {
          markMuiEventHandled(event)
          trigger()
        }
      }}
      onPointerDownCapture={markMuiEventHandled}
      onClickCapture={markMuiEventHandled}
      onKeyDownCapture={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          markMuiEventHandled(event)
          if (!disabled) {
            trigger()
          }
        }
      }}
      role="button"
      sx={{
        width: 18,
        height: 18,
        minWidth: 18,
        borderRadius: '50%',
        border: '2px solid',
        borderColor: tone.ring,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'default' : 'pointer',
        outline: 'none'
      }}
      tabIndex={disabled ? -1 : 0}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: tone.dot
        }}
      />
    </Box>
  )
}

function getEnabledButtonTone(
  theme: Theme,
  state: AssetEnabledState
) {
  switch (state) {
    case 'enabled':
      return {
        ring: theme.palette.success.main,
        dot: theme.palette.success.main
      }
    case 'mixed':
      return {
        ring: theme.palette.warning.main,
        dot: alpha(theme.palette.warning.main, 0.92)
      }
    default:
      return {
        ring: theme.palette.error.main,
        dot: 'transparent'
      }
  }
}

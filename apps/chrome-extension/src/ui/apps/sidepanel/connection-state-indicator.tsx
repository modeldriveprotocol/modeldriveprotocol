import { Box, Tooltip } from '@mui/material'

import type { PopupClientState } from '#~/background/shared.js'

import { connectionStateColor, connectionStateLabel } from './helpers.js'
import type { TranslateFn } from './types.js'

export function ConnectionStateIndicator({
  state,
  t
}: {
  state: PopupClientState['connectionState']
  t: TranslateFn
}) {
  return (
    <Tooltip title={connectionStateLabel(state, t)}>
      <Box
        aria-label={connectionStateLabel(state, t)}
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: connectionStateColor(state),
          flexShrink: 0
        }}
      />
    </Tooltip>
  )
}

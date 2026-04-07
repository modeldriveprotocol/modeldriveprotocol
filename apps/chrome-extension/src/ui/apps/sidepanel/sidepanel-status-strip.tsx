import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined'
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'

import type { SidepanelController } from './types.js'

export function SidepanelStatusStrip({ controller }: { controller: SidepanelController }) {
  const status = controller.error
    ? {
        tone: 'error' as const,
        icon: <ErrorOutlineOutlined fontSize="inherit" />,
        message: controller.error,
        action: controller.errorRecoveryAction
      }
    : controller.loading
      ? {
          tone: 'loading' as const,
          icon: <CircularProgress size={12} thickness={5} color="inherit" />,
          message: controller.t('common.loading'),
          action: undefined
        }
      : controller.flash
        ? {
            tone: 'success' as const,
            icon: <CheckCircleOutlineOutlined fontSize="inherit" />,
            message: controller.flash.message,
            action: controller.successFollowUpAction
          }
        : undefined

  if (!status) {
    return null
  }

  return (
    <Box sx={{ px: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
      <Box sx={statusShellSx[status.tone]}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <Box component="span" sx={{ display: 'inline-grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>
            {status.icon}
          </Box>
          <Typography variant="caption" noWrap title={status.message} sx={{ minWidth: 0 }}>
            {status.message}
          </Typography>
          {status.action ? (
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={status.action.onClick}
              startIcon={'icon' in status.action ? status.action.icon : undefined}
              sx={{ minWidth: 'auto', px: 0.5, py: 0, flexShrink: 0 }}
            >
              {status.action.label}
            </Button>
          ) : null}
        </Stack>
      </Box>
    </Box>
  )
}

const statusShellSx = {
  success: {
    display: 'flex',
    alignItems: 'center',
    maxWidth: '100%',
    px: 1,
    py: 0.5,
    borderRadius: '4px',
    border: '1px solid',
    borderColor: 'success.main',
    color: 'success.dark',
    bgcolor: 'background.paper'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    maxWidth: '100%',
    px: 1,
    py: 0.5,
    borderRadius: '4px',
    border: '1px solid',
    borderColor: 'error.main',
    color: 'error.main',
    bgcolor: 'background.paper'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    maxWidth: '100%',
    px: 1,
    py: 0.5,
    borderRadius: '4px',
    border: '1px solid',
    borderColor: 'divider',
    color: 'text.secondary',
    bgcolor: 'background.paper'
  }
} as const

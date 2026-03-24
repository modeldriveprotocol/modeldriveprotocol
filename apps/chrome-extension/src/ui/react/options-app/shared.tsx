import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import type { MouseEvent, ReactNode } from 'react'

export function OverviewStat({
  icon,
  label,
  tone = 'text.secondary'
}: {
  icon: ReactNode
  label: string
  tone?: string
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        minHeight: 40,
        px: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px'
      }}
    >
      <Box sx={{ color: tone, display: 'grid', placeItems: 'center' }}>{icon}</Box>
      <Typography variant="body2" color={tone}>
        {label}
      </Typography>
    </Stack>
  )
}

export function SectionPanel({
  action,
  children,
  description,
  icon,
  title
}: {
  action?: ReactNode
  children: ReactNode
  description?: string
  icon?: ReactNode
  title: string
}) {
  return (
    <Box sx={{ px: 0, py: 0.25 }}>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {icon ? <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>{icon}</Box> : null}
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
            </Stack>
            {description ? <Typography variant="body2" color="text.secondary">{description}</Typography> : null}
          </Box>
          {action}
        </Stack>
        {children}
      </Stack>
    </Box>
  )
}

export function ToolbarIcon({
  children,
  disabled,
  label,
  onClick
}: {
  children: ReactNode
  disabled?: boolean
  label: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton size="small" disabled={disabled} onClick={onClick} aria-label={label}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}

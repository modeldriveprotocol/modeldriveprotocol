import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import { Box, ButtonBase, Collapse, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import type { ClientIconKey } from '#~/shared/config.js'

import { renderClientIcon } from '../../foundation/client-icons.js'

const panelInsetX = 1.5
const panelInsetY = 1

export function ClientPanelShell({
  collapseLabel,
  expandLabel,
  expanded,
  onChange,
  icon,
  iconBadge,
  titlePrefix,
  title,
  onTitleClick,
  subtitle,
  children
}: {
  collapseLabel: string
  expandLabel: string
  expanded: boolean
  onChange: (expanded: boolean) => void
  icon: ClientIconKey
  iconBadge?: ReactNode
  titlePrefix?: ReactNode
  title: string
  onTitleClick?: () => void
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <Stack spacing={0} sx={panelSx}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: panelInsetX, py: panelInsetY }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={iconBoxSx}>
              {renderClientIcon(icon)}
              {iconBadge ? (
                <Box sx={iconBadgeShellSx}>
                  {iconBadge}
                </Box>
              ) : null}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                {titlePrefix ? (
                  <Box sx={{ color: 'text.secondary', lineHeight: 0, display: 'grid', placeItems: 'center' }}>
                    {titlePrefix}
                  </Box>
                ) : null}
                {onTitleClick ? (
                  <ButtonBase
                    onClick={(event) => {
                      event.stopPropagation()
                      onTitleClick()
                    }}
                    onFocus={(event) => {
                      event.stopPropagation()
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation()
                    }}
                    sx={titleButtonSx}
                  >
                    <Typography variant="subtitle2" noWrap>{title}</Typography>
                  </ButtonBase>
                ) : (
                  <Typography variant="subtitle2" noWrap>{title}</Typography>
                )}
              </Stack>
              {subtitle ? (
                <Box sx={{ color: 'text.secondary', lineHeight: 0, mt: 0.25 }}>
                  {subtitle}
                </Box>
              ) : null}
            </Box>
          </Stack>
        </Stack>
        <Tooltip title={expanded ? collapseLabel : expandLabel}>
          <IconButton
            size="small"
            aria-label={expanded ? collapseLabel : expandLabel}
            onClick={() => onChange(!expanded)}
            sx={{
              width: 28,
              height: 28,
              flexShrink: 0
            }}
          >
            <ExpandMoreOutlined
              fontSize="small"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 120ms ease'
              }}
            />
          </IconButton>
        </Tooltip>
      </Stack>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: panelInsetX, py: panelInsetY }}>{children}</Box>
      </Collapse>
    </Stack>
  )
}

const panelSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '4px !important',
  overflow: 'hidden'
}

const iconBoxSx = {
  width: 34,
  height: 34,
  position: 'relative',
  borderRadius: '4px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.primary',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  overflow: 'visible'
}

const iconBadgeShellSx = {
  position: 'absolute',
  right: -4,
  bottom: -4,
  width: 14,
  height: 14,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'background.paper',
  boxShadow: (theme: { palette: { background: { paper: string } } }) =>
    `0 0 0 2px ${theme.palette.background.paper}`
}

const titleButtonSx = {
  display: 'inline-flex',
  justifyContent: 'flex-start',
  maxWidth: '100%',
  borderRadius: 1,
  textAlign: 'left',
  '&:hover .MuiTypography-root': {
    color: 'primary.main',
    textDecoration: 'underline'
  },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 2
  }
}

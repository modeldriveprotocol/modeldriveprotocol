import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import { Accordion, AccordionDetails, AccordionSummary, Box, ButtonBase, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import type { ClientIconKey } from '#~/shared/config.js'

import { renderClientIcon } from '../../foundation/client-icons.js'

export function ClientPanelShell({
  expanded,
  onChange,
  icon,
  title,
  onTitleClick,
  subtitle,
  summaryMeta,
  children
}: {
  expanded: boolean
  onChange: (expanded: boolean) => void
  icon: ClientIconKey
  title: string
  onTitleClick?: () => void
  subtitle: string
  summaryMeta: ReactNode
  children: ReactNode
}) {
  return (
    <Accordion
      disableGutters
      expanded={expanded}
      onChange={(_event, nextExpanded) => onChange(nextExpanded)}
      sx={panelSx}
    >
      <AccordionSummary expandIcon={<ExpandMoreOutlined fontSize="small" />} sx={{ px: 1.5, py: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={iconBoxSx}>{renderClientIcon(icon)}</Box>
            <Box sx={{ minWidth: 0 }}>
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
              <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>
            </Box>
          </Stack>
          {summaryMeta}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, py: 1.25 }}>{children}</AccordionDetails>
    </Accordion>
  )
}

const panelSx = {
  '&::before': { display: 'none' },
  boxShadow: 'none',
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '4px !important',
  overflow: 'hidden'
}

const iconBoxSx = {
  width: 34,
  height: 34,
  borderRadius: '4px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.primary',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0
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

import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Stack, Typography } from '@mui/material'

import { openOptionsSection } from '../extension-api.js'
import { renderClientIcon } from '../client-icons.js'
import { connectionStateLabel } from './helpers.js'
import type { SidepanelController, SidepanelClientEntry } from './types.js'

export function BackgroundClientPanel({
  controller,
  item
}: {
  controller: SidepanelController
  item: SidepanelClientEntry
}) {
  return (
    <Accordion
      disableGutters
      expanded={controller.expandedClientKey === item.listId}
      onChange={(_event, expanded) => controller.setExpandedClientKey(expanded ? item.listId : undefined)}
      sx={panelSx}
    >
      <AccordionSummary expandIcon={<ExpandMoreOutlined fontSize="small" />} sx={{ px: 1.5, py: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={iconBoxSx}>{renderClientIcon(item.client.icon)}</Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>{item.client.clientName}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{controller.t('popup.backgroundClientSummary')}</Typography>
            </Box>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {connectionStateLabel(item.client.connectionState, controller.t)}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, py: 1.25 }}>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {item.client.clientDescription || controller.t('popup.backgroundClientSummary')}
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<SettingsOutlined fontSize="small" />}
            onClick={() => void openOptionsSection('clients', { clientId: 'background' })}
            sx={{ alignSelf: 'flex-start' }}
          >
            {controller.t('popup.errorRecovery.clients')}
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  )
}

const panelSx = {
  '&::before': { display: 'none' },
  boxShadow: 'none',
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '14px !important',
  overflow: 'hidden'
}

const iconBoxSx = {
  width: 34,
  height: 34,
  borderRadius: '10px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.primary',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0
}

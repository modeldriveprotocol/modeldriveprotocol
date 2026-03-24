import AddCircleOutlineOutlined from '@mui/icons-material/AddCircleOutlineOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import GridViewOutlined from '@mui/icons-material/GridViewOutlined'
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import WebOutlined from '@mui/icons-material/WebOutlined'
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Divider, IconButton, List, ListItem, ListItemText, Paper, Stack, Tooltip, Typography } from '@mui/material'

import { openOptionsSection, requestRouteClientFromActiveTab, runRecording } from '../extension-api.js'
import { renderClientIcon } from '../client-icons.js'
import { abilitySummary, connectionStateLabel, stateTone } from '../popup-app/helpers.js'
import { ActionIcon } from './action-icon.js'
import type { PopupController } from './types.js'

export function PopupClientsPanel({ controller }: { controller: PopupController }) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <GridViewOutlined fontSize="small" color="primary" />
          <Box>
            <Typography variant="subtitle2">{controller.t('popup.pageClientsTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">{controller.t('popup.pageClientsDescription')}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <ActionIcon label={controller.t('popup.createClientFromPage')} onClick={() => void controller.runAction(controller.t('popup.routePresetCreated'), async () => { await requestRouteClientFromActiveTab() }, { suggestSelectedClientPrimary: true })}><AddCircleOutlineOutlined fontSize="small" /></ActionIcon>
          <ActionIcon label={controller.t('popup.importClient')} onClick={() => void openOptionsSection('settings')}><DownloadOutlined fontSize="small" /></ActionIcon>
        </Stack>
      </Stack>
      <Divider />
      {controller.pageRouteClients.length === 0 ? (
        <Box sx={{ px: 1.5, py: 2 }}>
          <Typography variant="body2" color="text.secondary">{controller.t('popup.noMatchingClient')}</Typography>
        </Box>
      ) : controller.pageRouteClients.map((client) => {
        const routeConfig = controller.state?.config.routeClients.find((item) => item.id === client.id)
        return (
          <Accordion key={client.clientKey} disableGutters elevation={0} expanded={controller.selectedClient?.id === client.id} onChange={(_, expanded) => controller.setSelectedClientId(expanded ? client.id : controller.selectedClient?.id)} sx={{ '&::before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary sx={{ px: 1.5, py: 0.5 }}>
              <Stack direction="row" spacing={1.25} alignItems="center" width="100%">
                <Box sx={iconBoxSx}>{renderClientIcon(client.icon)}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>{client.clientName}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{client.routeRuleSummary ?? client.matchPatterns[0] ?? controller.t('popup.noRouteRules')}</Typography>
                </Box>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Chip size="small" icon={<WebOutlined />} label={client.matchesActiveTab ? controller.t('popup.clientMatched') : controller.t('popup.clientAvailable')} color={client.matchesActiveTab ? 'success' : 'default'} />
                  <Chip size="small" icon={<StorageOutlined />} label={connectionStateLabel(client.connectionState, controller.t)} color={stateTone(client.connectionState)} />
                </Stack>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 1.5, py: 1.25 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                  {abilitySummary(client, controller.t).map((item) => <Chip key={item} size="small" variant="outlined" label={item} />)}
                </Stack>
                {routeConfig?.recordings?.length ? (
                  <List dense disablePadding>
                    {routeConfig.recordings.slice(0, 3).map((recording) => (
                      <ListItem key={recording.id} disablePadding secondaryAction={<Tooltip title={controller.t('popup.replayFlow')}><IconButton edge="end" size="small" onClick={() => void controller.runAction(controller.t('popup.replayedFlow'), async () => { if (client.id) await runRecording(client.id, recording.id) })}><PlayArrowOutlined fontSize="small" /></IconButton></Tooltip>} sx={{ py: 0.25 }}>
                        <ListItemText primary={recording.name} secondary={controller.t('popup.flowSteps', { count: recording.steps.length })} primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }} />
                      </ListItem>
                    ))}
                  </List>
                ) : <Typography variant="body2" color="text.secondary">{controller.t('popup.noFlows')}</Typography>}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Paper>
  )
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
  placeItems: 'center'
}

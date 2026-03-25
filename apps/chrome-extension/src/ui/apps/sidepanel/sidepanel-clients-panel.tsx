import { Box, Button, List, ListItem, ListItemText, Stack, Typography } from '@mui/material'
import { memo } from 'react'

import { openOptionsSection } from '../../platform/extension-api.js'
import { BackgroundClientPanel } from './background-client-panel.js'
import { RouteClientPanel } from './route-client-panel.js'
import type { SidepanelController } from './types.js'

function SidepanelClientsPanelComponent({ controller }: { controller: SidepanelController }) {
  return (
    <>
      {controller.pageRouteClients.length === 0 ? <SidepanelEmptyState controller={controller} /> : null}
      {controller.filteredSidepanelClients.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {controller.t('popup.noFilteredClients')}
        </Typography>
      ) : null}
      {controller.filteredSidepanelClients.map((item) =>
        item.type === 'background'
          ? <BackgroundClientPanel key={item.listId} controller={controller} item={item} />
          : <RouteClientPanel key={item.listId} controller={controller} item={item} />
      )}
    </>
  )
}

export const SidepanelClientsPanel = memo(
  SidepanelClientsPanelComponent,
  (previousProps, nextProps) =>
    previousProps.controller.t === nextProps.controller.t &&
    previousProps.controller.state === nextProps.controller.state &&
    previousProps.controller.pageRouteClients === nextProps.controller.pageRouteClients &&
    previousProps.controller.filteredSidepanelClients === nextProps.controller.filteredSidepanelClients &&
    previousProps.controller.relatedRouteClients === nextProps.controller.relatedRouteClients &&
    previousProps.controller.expandedClientKey === nextProps.controller.expandedClientKey &&
    previousProps.controller.recordingName === nextProps.controller.recordingName &&
    previousProps.controller.recordingDescription === nextProps.controller.recordingDescription &&
    previousProps.controller.activeTabHasPermission === nextProps.controller.activeTabHasPermission &&
    previousProps.controller.canCreateFromActivePage === nextProps.controller.canCreateFromActivePage
)

function SidepanelEmptyState({ controller }: { controller: SidepanelController }) {
  return (
    <Box sx={{ py: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        {controller.canCreateFromActivePage ? controller.t('popup.noMatchingClient') : controller.t('popup.unsupportedActivePage')}
      </Typography>
      {!controller.canCreateFromActivePage && controller.relatedRouteClients.length === 0 ? (
        <Button size="small" variant="text" onClick={() => void openOptionsSection('clients')} sx={{ mt: 1, px: 0 }}>
          {controller.t('popup.errorRecovery.clients')}
        </Button>
      ) : null}
      {controller.relatedRouteClients.length ? (
        <Stack spacing={1} sx={{ mt: 1.25 }}>
          <Typography variant="caption" color="text.secondary">{controller.t('popup.relatedClientsTitle')}</Typography>
          <List dense disablePadding>
            {controller.relatedRouteClients.slice(0, 3).map((client) => (
              <ListItem key={client.id} disablePadding sx={{ py: 0.5 }}>
                <ListItemText
                  primary={client.clientName}
                  secondary={client.matchPatterns.join(', ')}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
          <Button
            size="small"
            variant="text"
            onClick={() => void openOptionsSection('clients', { clientId: controller.relatedRouteClients[0]?.id })}
            sx={{ alignSelf: 'flex-start', px: 0 }}
          >
            {controller.t('popup.relatedClientsAction')}
          </Button>
        </Stack>
      ) : null}
    </Box>
  )
}

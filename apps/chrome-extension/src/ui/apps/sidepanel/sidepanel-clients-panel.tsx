import { Box, Button, List, ListItem, ListItemText, Stack, Typography } from '@mui/material'
import { memo, useMemo, useState } from 'react'

import { BackgroundClientPanel } from './background-client-panel.js'
import { RouteClientPanel } from './route-client-panel.js'
import type { SidepanelController } from './types.js'

function SidepanelClientsPanelComponent({ controller }: { controller: SidepanelController }) {
  const hasFiltering =
    controller.clientFilter !== 'all' || controller.clientSearch.trim().length > 0
  const [expandedClientKeys, setExpandedClientKeys] = useState<string[]>([])
  const visibleClientKeys = useMemo(
    () => new Set(controller.filteredSidepanelClients.map((item) => item.listId)),
    [controller.filteredSidepanelClients]
  )

  function setClientExpanded(clientKey: string, expanded: boolean) {
    setExpandedClientKeys((current) => {
      const next = current.filter((key) => visibleClientKeys.has(key))
      if (expanded) {
        return next.includes(clientKey) ? next : [...next, clientKey]
      }
      return next.filter((key) => key !== clientKey)
    })
  }

  return (
    <>
      {controller.pageRouteClients.length === 0 && controller.backgroundClients.length === 0 ? (
        <SidepanelEmptyState controller={controller} />
      ) : null}
      {controller.filteredSidepanelClients.length === 0 ? (
        <Stack spacing={0.75} sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {controller.t('popup.noFilteredClients')}
          </Typography>
          {hasFiltering ? (
            <Button
              size="small"
              variant="text"
              onClick={() => {
                controller.setClientSearch('')
                controller.setClientFilter('all')
              }}
              sx={{ alignSelf: 'flex-start', px: 0 }}
            >
              {controller.t('popup.resetClientFilters')}
            </Button>
          ) : null}
        </Stack>
      ) : null}
      {controller.filteredSidepanelClients.map((item) =>
        item.type === 'background' ? (
          <BackgroundClientPanel
            key={item.listId}
            controller={controller}
            item={item}
            expanded={expandedClientKeys.includes(item.listId)}
            onExpandedChange={(expanded) => setClientExpanded(item.listId, expanded)}
          />
        ) : (
          <RouteClientPanel
            key={item.listId}
            controller={controller}
            item={item}
            expanded={expandedClientKeys.includes(item.listId)}
            onExpandedChange={(expanded) => setClientExpanded(item.listId, expanded)}
          />
        )
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
      {controller.relatedRouteClients.length ? (
        <Stack spacing={1} sx={{ mt: 1 }}>
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
        </Stack>
      ) : null}
    </Box>
  )
}

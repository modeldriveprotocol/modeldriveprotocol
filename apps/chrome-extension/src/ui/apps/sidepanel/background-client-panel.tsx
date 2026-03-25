import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import { Button, Stack, Typography } from '@mui/material'

import { openOptionsSection } from '../../platform/extension-api.js'
import { ClientPanelShell } from './client-panel-shell.js'
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
    <ClientPanelShell
      expanded={controller.expandedClientKey === item.listId}
      onChange={(expanded) => controller.setExpandedClientKey(expanded ? item.listId : undefined)}
      icon={item.client.icon}
      title={item.client.clientName}
      subtitle={controller.t('popup.backgroundClientSummary')}
      summaryMeta={(
        <Typography variant="caption" color="text.secondary">
          {connectionStateLabel(item.client.connectionState, controller.t)}
        </Typography>
      )}
    >
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {item.client.clientDescription || controller.t('popup.backgroundClientSummary')}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<SettingsOutlined fontSize="small" />}
          onClick={() => void openOptionsSection('clients', { clientId: item.client.id })}
          sx={{ alignSelf: 'flex-start' }}
        >
          {controller.t('popup.errorRecovery.clients')}
        </Button>
      </Stack>
    </ClientPanelShell>
  )
}

import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import { Alert, Box, Button, InputAdornment, List, ListItem, ListItemText, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'

import { openOptionsSection } from '../../platform/extension-api.js'
import { ActionIcon } from './action-icon.js'
import { BackgroundClientPanel } from './background-client-panel.js'
import { RouteClientPanel } from './route-client-panel.js'
import type { SidepanelController } from './types.js'

export function SidepanelView({ controller }: { controller: SidepanelController }) {
  return (
    <Stack spacing={0} sx={{ minHeight: '100vh' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0, pr: 1 }}>
          {controller.t('popup.sidepanelSummary', { background: controller.backgroundClients.length, page: controller.pageRouteClients.length, online: controller.state?.onlineClientCount ?? 0 })}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <ActionIcon label={controller.sidepanelPrimaryAction.label} onClick={controller.sidepanelPrimaryAction.onClick} disabled={controller.sidepanelPrimaryAction.disabled} emphasis>{controller.sidepanelPrimaryAction.icon}</ActionIcon>
          <ActionIcon label={controller.t('popup.importClient')} onClick={() => void openOptionsSection('settings')}><DownloadOutlined fontSize="small" /></ActionIcon>
          <ActionIcon label={controller.t('popup.openOptions')} onClick={() => void openOptionsSection('clients', { clientId: controller.selectedOptionsClientId })}><SettingsOutlined fontSize="small" /></ActionIcon>
          <ActionIcon label={controller.t('popup.openMarket')} onClick={() => void openOptionsSection('market')}><StorefrontOutlined fontSize="small" /></ActionIcon>
        </Stack>
      </Stack>

      <Box sx={{ px: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
        <Typography variant="body2" color="text.secondary" noWrap>{controller.sidepanelFocusText}</Typography>
      </Box>

      <Stack spacing={1} sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small"
          placeholder={controller.t('popup.searchClients')}
          value={controller.clientSearch}
          onChange={(event) => controller.setClientSearch(event.target.value)}
          fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }}
        />
        <ToggleButtonGroup size="small" exclusive value={controller.clientFilter} onChange={(_event, nextValue) => nextValue && controller.setClientFilter(nextValue)} sx={{ alignSelf: 'flex-start' }}>
          <ToggleButton value="all">{controller.t('popup.filter.all')}</ToggleButton>
          <ToggleButton value="background">{controller.t('popup.filter.background')}</ToggleButton>
          <ToggleButton value="route">{controller.t('popup.filter.route')}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <FeedbackBanners controller={controller} />

      <Stack spacing={1} sx={{ px: 2, py: 1 }}>
        {controller.pageRouteClients.length === 0 ? <SidepanelEmptyState controller={controller} /> : null}
        {controller.filteredSidepanelClients.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{controller.t('popup.noFilteredClients')}</Typography> : null}
        {controller.filteredSidepanelClients.map((item) => item.type === 'background' ? <BackgroundClientPanel key={item.listId} controller={controller} item={item} /> : <RouteClientPanel key={item.listId} controller={controller} item={item} />)}
      </Stack>
    </Stack>
  )
}

function FeedbackBanners({ controller }: { controller: SidepanelController }) {
  return (
    <>
      {controller.flash ? <Alert severity="success" sx={{ borderRadius: 0 }} action={controller.successFollowUpAction ? <Button color="inherit" size="small" onClick={controller.successFollowUpAction.onClick} startIcon={controller.successFollowUpAction.icon}>{controller.successFollowUpAction.label}</Button> : undefined}>{controller.flash.message}</Alert> : null}
      {controller.error ? <Alert severity="error" sx={{ borderRadius: 0 }} action={controller.errorRecoveryAction ? <Button color="inherit" size="small" onClick={controller.errorRecoveryAction.onClick}>{controller.errorRecoveryAction.label}</Button> : undefined}>{controller.error}</Alert> : null}
      {controller.loading ? <Alert severity="info" sx={{ borderRadius: 0 }}>{controller.t('common.loading')}</Alert> : null}
    </>
  )
}

function SidepanelEmptyState({ controller }: { controller: SidepanelController }) {
  return (
    <Box sx={{ py: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        {controller.canCreateFromActivePage ? controller.t('popup.noMatchingClient') : controller.t('popup.unsupportedActivePage')}
      </Typography>
      {!controller.canCreateFromActivePage && controller.relatedRouteClients.length === 0 ? <Button size="small" variant="text" onClick={() => void openOptionsSection('clients')} sx={{ mt: 1, px: 0 }}>{controller.t('popup.errorRecovery.clients')}</Button> : null}
      {controller.relatedRouteClients.length ? (
        <Stack spacing={1} sx={{ mt: 1.25 }}>
          <Typography variant="caption" color="text.secondary">{controller.t('popup.relatedClientsTitle')}</Typography>
          <List dense disablePadding>
            {controller.relatedRouteClients.slice(0, 3).map((client) => (
              <ListItem key={client.id} disablePadding sx={{ py: 0.5 }}>
                <ListItemText primary={client.clientName} secondary={client.matchPatterns.join(', ')} primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }} />
              </ListItem>
            ))}
          </List>
          <Button size="small" variant="text" onClick={() => void openOptionsSection('clients', { clientId: controller.relatedRouteClients[0]?.id })} sx={{ alignSelf: 'flex-start', px: 0 }}>{controller.t('popup.relatedClientsAction')}</Button>
        </Stack>
      ) : null}
    </Box>
  )
}

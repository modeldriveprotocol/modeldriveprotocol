import SearchOutlined from '@mui/icons-material/SearchOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import { InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'

import { openOptionsSection } from '../../platform/extension-api.js'
import { ActionIcon } from './action-icon.js'
import { MarketPanel } from './market-panel.js'
import { SidepanelClientsPanel } from './sidepanel-clients-panel.js'
import { SidepanelStatusStrip } from './sidepanel-status-strip.js'
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
          <ActionIcon label={controller.t('popup.openWorkspace')} onClick={() => void openOptionsSection('workspace')}><StorageOutlined fontSize="small" /></ActionIcon>
          <ActionIcon label={controller.contentMode === 'market' ? controller.t('popup.showClients') : controller.t('popup.showMarket')} onClick={() => controller.setContentMode(controller.contentMode === 'market' ? 'clients' : 'market')} emphasis={controller.contentMode === 'market'}><StorefrontOutlined fontSize="small" /></ActionIcon>
        </Stack>
      </Stack>

      <SidepanelStatusStrip controller={controller} />

      {controller.contentMode === 'market' ? (
        <Stack spacing={1} sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder={controller.t('popup.searchMarketTemplates')}
            value={controller.marketSearch}
            onChange={(event) => controller.setMarketSearch(event.target.value)}
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }}
          />
        </Stack>
      ) : (
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
      )}

      <Stack spacing={1} sx={{ px: 2, py: 1 }}>
        {controller.contentMode === 'market' ? (
          <MarketPanel controller={controller} />
        ) : (
          <SidepanelClientsPanel controller={controller} />
        )}
      </Stack>
    </Stack>
  )
}

import DnsOutlined from '@mui/icons-material/DnsOutlined'
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import ViewModuleOutlined from '@mui/icons-material/ViewModuleOutlined'
import WebOutlined from '@mui/icons-material/WebOutlined'
import {
  Collapse,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import { useState } from 'react'

import { openOptionsSection } from '../../platform/extension-api.js'
import { ActionIcon } from './action-icon.js'
import { MarketPanel } from './market-panel.js'
import { SidepanelClientsPanel } from './sidepanel-clients-panel.js'
import { SidepanelStatusStrip } from './sidepanel-status-strip.js'
import type { SidepanelController } from './types.js'

export function SidepanelView({ controller }: { controller: SidepanelController }) {
  const [clientFiltersExpanded, setClientFiltersExpanded] = useState(false)

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
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder={controller.t('popup.searchClients')}
              value={controller.clientSearch}
              onChange={(event) => controller.setClientSearch(event.target.value)}
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }}
            />
            <ActionIcon
              label={
                clientFiltersExpanded
                  ? controller.t('popup.hideFilters')
                  : controller.t('popup.showFilters')
              }
              onClick={() => setClientFiltersExpanded((current) => !current)}
              emphasis={clientFiltersExpanded}
              size={40}
            >
              <ExpandMoreOutlined
                fontSize="small"
                style={{
                  transform: clientFiltersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 120ms ease'
                }}
              />
            </ActionIcon>
          </Stack>
          <Collapse in={clientFiltersExpanded} timeout="auto" unmountOnExit>
            <Stack direction="row" justifyContent="flex-end" sx={{ pt: 0.25 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={controller.clientFilter}
                onChange={(_event, nextValue) =>
                  nextValue && controller.setClientFilter(nextValue)
                }
              >
                <Tooltip title={controller.t('popup.filter.all')}>
                  <ToggleButton
                    value="all"
                    aria-label={controller.t('popup.filter.all')}
                    sx={{ width: 36, height: 32, p: 0 }}
                  >
                    <ViewModuleOutlined fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title={controller.t('popup.filter.background')}>
                  <ToggleButton
                    value="background"
                    aria-label={controller.t('popup.filter.background')}
                    sx={{ width: 36, height: 32, p: 0 }}
                  >
                    <DnsOutlined fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title={controller.t('popup.filter.route')}>
                  <ToggleButton
                    value="route"
                    aria-label={controller.t('popup.filter.route')}
                    sx={{ width: 36, height: 32, p: 0 }}
                  >
                    <WebOutlined fontSize="small" />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            </Stack>
          </Collapse>
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

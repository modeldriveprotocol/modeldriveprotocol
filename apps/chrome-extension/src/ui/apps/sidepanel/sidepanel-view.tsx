import DnsOutlined from '@mui/icons-material/DnsOutlined'
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import ViewModuleOutlined from '@mui/icons-material/ViewModuleOutlined'
import WebOutlined from '@mui/icons-material/WebOutlined'
import {
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { openOptionsSection } from '../../platform/extension-api.js'
import { ActionIcon } from './action-icon.js'
import { MarketPanel } from './market-panel.js'
import { SidepanelClientsPanel } from './sidepanel-clients-panel.js'
import { SidepanelStatusStrip } from './sidepanel-status-strip.js'
import type { SidepanelController } from './types.js'

const searchFieldSx = {
  '& .MuiOutlinedInput-root': {
    px: 0.5
  },
  '& .MuiOutlinedInput-input': {
    px: 0
  }
} as const

const searchStartAdornmentSx = {
  ml: 0.25,
  mr: 0.75,
  color: 'text.secondary'
} as const

const searchEndAdornmentSx = {
  mr: 0.25,
  ml: 0.5
} as const

const searchIconButtonSx = {
  width: 28,
  height: 28
} as const

const summaryMetricSx = {
  color: 'text.secondary',
  flexShrink: 0
} as const

const sectionInsetX = 2
const sectionInsetY = 1

export function SidepanelView({ controller }: { controller: SidepanelController }) {
  const [clientFiltersExpanded, setClientFiltersExpanded] = useState(false)
  const clientSearchInputRef = useRef<HTMLInputElement | null>(null)
  const marketSearchInputRef = useRef<HTMLInputElement | null>(null)

  const hasClientFilters =
    controller.clientFilter !== 'all' || controller.clientSearch.trim().length > 0

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isEditableTarget =
        Boolean(target?.closest('input, textarea')) || target?.isContentEditable
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget
      ) {
        event.preventDefault()
        if (controller.contentMode === 'market') {
          marketSearchInputRef.current?.focus()
          return
        }
        clientSearchInputRef.current?.focus()
      }
      if (event.key !== 'Escape') {
        return
      }
      if (controller.contentMode === 'market') {
        if (controller.marketSearch) {
          event.preventDefault()
          controller.setMarketSearch('')
        }
        return
      }
      if (controller.clientSearch || clientFiltersExpanded) {
        event.preventDefault()
        controller.setClientSearch('')
        setClientFiltersExpanded(false)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [
    clientFiltersExpanded,
    controller.clientSearch,
    controller.contentMode,
    controller.marketSearch,
    controller.setClientSearch,
    controller.setMarketSearch
  ])

  return (
    <Stack spacing={0} sx={{ minHeight: '100vh' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: sectionInsetX,
          py: sectionInsetY,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0, pr: 1 }}>
          <Tooltip title={controller.t('popup.section.background')}>
            <Stack
              direction="row"
              spacing={0.25}
              alignItems="center"
              aria-label={`${controller.t('popup.section.background')} ${controller.backgroundClients.length}`}
              sx={summaryMetricSx}
            >
              <DnsOutlined fontSize="inherit" />
              <Typography variant="caption" color="inherit">
                {controller.backgroundClients.length}
              </Typography>
            </Stack>
          </Tooltip>
          <Tooltip title={controller.t('popup.section.currentPage')}>
            <Stack
              direction="row"
              spacing={0.25}
              alignItems="center"
              aria-label={`${controller.t('popup.section.currentPage')} ${controller.pageRouteClients.length}`}
              sx={summaryMetricSx}
            >
              <WebOutlined fontSize="inherit" />
              <Typography variant="caption" color="inherit">
                {controller.pageRouteClients.length}
              </Typography>
            </Stack>
          </Tooltip>
          <Tooltip title={controller.t('popup.onlineClientsBadge', { count: controller.state?.onlineClientCount ?? 0 })}>
            <Stack
              direction="row"
              spacing={0.25}
              alignItems="center"
              aria-label={controller.t('popup.onlineClientsBadge', { count: controller.state?.onlineClientCount ?? 0 })}
              sx={summaryMetricSx}
            >
              <HubOutlined fontSize="inherit" />
              <Typography variant="caption" color="inherit">
                {controller.state?.onlineClientCount ?? 0}
              </Typography>
            </Stack>
          </Tooltip>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <ActionIcon label={controller.sidepanelPrimaryAction.label} onClick={controller.sidepanelPrimaryAction.onClick} disabled={controller.sidepanelPrimaryAction.disabled} emphasis>{controller.sidepanelPrimaryAction.icon}</ActionIcon>
          <ActionIcon label={controller.t('popup.openWorkspace')} onClick={() => void openOptionsSection('workspace')}><StorageOutlined fontSize="small" /></ActionIcon>
          <ActionIcon label={controller.contentMode === 'market' ? controller.t('popup.showClients') : controller.t('popup.showMarket')} onClick={() => controller.setContentMode(controller.contentMode === 'market' ? 'clients' : 'market')} emphasis={controller.contentMode === 'market'}><StorefrontOutlined fontSize="small" /></ActionIcon>
        </Stack>
      </Stack>

      <SidepanelStatusStrip controller={controller} />

      {controller.contentMode === 'market' ? (
        <Stack
          spacing={1}
          sx={{
            px: sectionInsetX,
            py: sectionInsetY,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <TextField
            size="small"
            placeholder={controller.t('popup.searchMarketTemplates')}
            value={controller.marketSearch}
            onChange={(event) => controller.setMarketSearch(event.target.value)}
            inputRef={marketSearchInputRef}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && controller.marketSearch) {
                event.preventDefault()
                controller.setMarketSearch('')
              }
            }}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={searchStartAdornmentSx}>
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: controller.marketSearch ? (
                <InputAdornment position="end" sx={searchEndAdornmentSx}>
                  <Tooltip title={controller.t('popup.clearSearch')}>
                    <IconButton
                      aria-label={controller.t('popup.clearSearch')}
                      edge="end"
                      size="small"
                      onClick={() => controller.setMarketSearch('')}
                      sx={searchIconButtonSx}
                    >
                      <CloseOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : null
            }}
            sx={searchFieldSx}
          />
        </Stack>
      ) : (
        <Stack
          spacing={1}
          sx={{
            px: sectionInsetX,
            py: sectionInsetY,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder={controller.t('popup.searchClients')}
              value={controller.clientSearch}
              onChange={(event) => controller.setClientSearch(event.target.value)}
              inputRef={clientSearchInputRef}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && (controller.clientSearch || clientFiltersExpanded)) {
                  event.preventDefault()
                  controller.setClientSearch('')
                  setClientFiltersExpanded(false)
                }
              }}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={searchStartAdornmentSx}>
                    <SearchOutlined fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end" sx={searchEndAdornmentSx}>
                    <Stack direction="row" spacing={0.25} alignItems="center">
                      {controller.clientSearch ? (
                        <Tooltip title={controller.t('popup.clearSearch')}>
                          <IconButton
                            aria-label={controller.t('popup.clearSearch')}
                            edge="end"
                            size="small"
                            onClick={() => controller.setClientSearch('')}
                            sx={searchIconButtonSx}
                          >
                            <CloseOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      <Tooltip
                        title={
                          clientFiltersExpanded
                            ? controller.t('popup.hideFilters')
                            : controller.t('popup.showFilters')
                        }
                      >
                        <IconButton
                          aria-label={
                            clientFiltersExpanded
                              ? controller.t('popup.hideFilters')
                              : controller.t('popup.showFilters')
                          }
                          edge="end"
                          size="small"
                          onClick={() => setClientFiltersExpanded((current) => !current)}
                          sx={searchIconButtonSx}
                        >
                          <ExpandMoreOutlined
                            fontSize="small"
                            style={{
                              transform: clientFiltersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 120ms ease'
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </InputAdornment>
                )
              }}
              sx={searchFieldSx}
            />
          </Stack>
          <Collapse in={clientFiltersExpanded} timeout="auto" unmountOnExit>
            <Stack direction="row" justifyContent="flex-end" sx={{ pt: 0.5 }}>
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

      <Stack spacing={1} sx={{ px: sectionInsetX, py: sectionInsetY }}>
        {controller.contentMode === 'market' ? (
          <MarketPanel controller={controller} />
        ) : (
          <SidepanelClientsPanel controller={controller} />
        )}
      </Stack>
    </Stack>
  )
}

import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import DnsOutlined from '@mui/icons-material/DnsOutlined'
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined'
import StarOutlined from '@mui/icons-material/StarOutlined'
import ViewModuleOutlined from '@mui/icons-material/ViewModuleOutlined'
import WebOutlined from '@mui/icons-material/WebOutlined'
import WindowOutlined from '@mui/icons-material/WindowOutlined'
import {
  Button,
  Checkbox,
  Collapse,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import { useState, type MouseEvent as ReactMouseEvent } from 'react'

import { ToolbarIcon } from '../../shared.js'
import type {
  BulkClientAction,
  ClientTypeFilter
} from './types.js'

export function ClientsListToolbar({
  allVisibleSelected,
  canCreateFromPage,
  canDeleteSelection,
  clientTypeFilter,
  controlsExpanded,
  filteredClientCount,
  onApplyBulk,
  onCreateClient,
  onCreateClientFromPage,
  onFilterChange,
  onRequestDeleteSelection,
  onRouteSearchChange,
  onSelectAllVisible,
  onToggleControlsExpanded,
  routeSearch,
  selectedCount,
  t
}: {
  allVisibleSelected: boolean
  canCreateFromPage: boolean
  canDeleteSelection: boolean
  clientTypeFilter: ClientTypeFilter
  controlsExpanded: boolean
  filteredClientCount: number
  onApplyBulk: (action: BulkClientAction) => void
  onCreateClient: (kind: 'background' | 'route') => void
  onCreateClientFromPage: () => void
  onFilterChange: (value: ClientTypeFilter) => void
  onRequestDeleteSelection: (anchorEl: HTMLElement) => void
  onRouteSearchChange: (value: string) => void
  onSelectAllVisible: (checked: boolean) => void
  onToggleControlsExpanded: () => void
  routeSearch: string
  selectedCount: number
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(
    null
  )

  return (
    <Stack spacing={1} sx={{ pt: 1, pb: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('options.clients.search')}
          value={routeSearch}
          onChange={(event) => onRouteSearchChange(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 40
            }
          }}
        />
        <Button
          variant="contained"
          onClick={(event) => setCreateMenuAnchor(event.currentTarget)}
          sx={{
            width: 40,
            minWidth: 40,
            height: 40,
            p: 0
          }}
        >
          <AddOutlined fontSize="small" />
        </Button>
        <Button
          aria-label={
            controlsExpanded
              ? t('options.clients.hideFiltersAndSelection')
              : t('options.clients.showFiltersAndSelection')
          }
          variant="outlined"
          onClick={onToggleControlsExpanded}
          sx={{
            width: 40,
            minWidth: 40,
            height: 40,
            p: 0
          }}
        >
          <ExpandMoreOutlined
            fontSize="small"
            sx={{
              transform: controlsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 120ms ease'
            }}
          />
        </Button>
      </Stack>

      <Menu
        anchorEl={createMenuAnchor}
        open={Boolean(createMenuAnchor)}
        onClose={() => setCreateMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setCreateMenuAnchor(null)
            onCreateClient('route')
          }}
        >
          {t('options.clients.type.route')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setCreateMenuAnchor(null)
            onCreateClient('background')
          }}
        >
          {t('options.clients.type.background')}
        </MenuItem>
        <MenuItem
          disabled={!canCreateFromPage}
          onClick={() => {
            setCreateMenuAnchor(null)
            onCreateClientFromPage()
          }}
        >
          {t('options.clients.addFromPage')}
        </MenuItem>
      </Menu>

      <Collapse in={controlsExpanded} timeout="auto" unmountOnExit>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            {filteredClientCount > 0 ? (
              <Checkbox
                size="small"
                checked={allVisibleSelected}
                indeterminate={!allVisibleSelected && selectedCount > 0}
                onChange={(_event, checked) => onSelectAllVisible(checked)}
              />
            ) : null}
            <ToggleButtonGroup
              exclusive
              size="small"
              value={clientTypeFilter}
              onChange={(_event, nextValue) => {
                if (nextValue) {
                  onFilterChange(nextValue)
                }
              }}
            >
              <Tooltip title={t('options.clients.filter.all')}>
                <ToggleButton
                  value="all"
                  aria-label={t('options.clients.filter.all')}
                  sx={{ width: 36, height: 32, p: 0 }}
                >
                  <ViewModuleOutlined fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title={t('options.clients.type.background')}>
                <ToggleButton
                  value="background"
                  aria-label={t('options.clients.type.background')}
                  sx={{ width: 36, height: 32, p: 0 }}
                >
                  <DnsOutlined fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title={t('options.clients.type.route')}>
                <ToggleButton
                  value="route"
                  aria-label={t('options.clients.type.route')}
                  sx={{ width: 36, height: 32, p: 0 }}
                >
                  <WebOutlined fontSize="small" />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          </Stack>

          {selectedCount > 0 ? (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Typography variant="caption" color="text.secondary">
                {t('options.clients.selected', { count: selectedCount })}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <ToolbarIcon
                  label={t('options.clients.enable')}
                  onClick={() => onApplyBulk('enable')}
                >
                  <WindowOutlined fontSize="small" />
                </ToolbarIcon>
                <ToolbarIcon
                  label={t('options.clients.disable')}
                  onClick={() => onApplyBulk('disable')}
                >
                  <WindowOutlined
                    fontSize="small"
                    sx={{ transform: 'rotate(180deg)' }}
                  />
                </ToolbarIcon>
                <ToolbarIcon
                  label={t('options.clients.favorite')}
                  onClick={() => onApplyBulk('favorite')}
                  tone="warning"
                >
                  <StarOutlined fontSize="small" />
                </ToolbarIcon>
                <ToolbarIcon
                  label={t('options.clients.unfavorite')}
                  onClick={() => onApplyBulk('unfavorite')}
                  tone="warning"
                >
                  <StarBorderOutlined fontSize="small" />
                </ToolbarIcon>
                <ToolbarIcon
                  label={t('options.clients.delete')}
                  onClick={(event) =>
                    onRequestDeleteSelection(
                      (event as ReactMouseEvent<HTMLButtonElement>).currentTarget
                    )
                  }
                  disabled={!canDeleteSelection}
                  tone="error"
                >
                  <DeleteOutlineOutlined fontSize="small" />
                </ToolbarIcon>
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </Collapse>
    </Stack>
  )
}

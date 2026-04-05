import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined'
import StarOutlined from '@mui/icons-material/StarOutlined'
import WindowOutlined from '@mui/icons-material/WindowOutlined'
import {
  Button,
  Checkbox,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
  filteredClientCount,
  onApplyBulk,
  onCreateClient,
  onCreateClientFromPage,
  onFilterChange,
  onRequestDeleteSelection,
  onRouteSearchChange,
  onSelectAllVisible,
  routeSearch,
  selectedCount,
  t
}: {
  allVisibleSelected: boolean
  canCreateFromPage: boolean
  canDeleteSelection: boolean
  clientTypeFilter: ClientTypeFilter
  filteredClientCount: number
  onApplyBulk: (action: BulkClientAction) => void
  onCreateClient: (kind: 'background' | 'route') => void
  onCreateClientFromPage: () => void
  onFilterChange: (value: ClientTypeFilter) => void
  onRequestDeleteSelection: (anchorEl: HTMLElement) => void
  onRouteSearchChange: (value: string) => void
  onSelectAllVisible: (checked: boolean) => void
  routeSearch: string
  selectedCount: number
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(
    null
  )

  return (
    <Stack spacing={1} sx={{ py: 1 }}>
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
        />
        <Button
          variant="contained"
          onClick={(event) => setCreateMenuAnchor(event.currentTarget)}
          sx={{ minWidth: 40, px: 1.25 }}
        >
          <AddOutlined fontSize="small" />
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

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
      >
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
          <ToggleButton value="all">
            {t('options.clients.filter.all')}
          </ToggleButton>
          <ToggleButton value="background">
            {t('options.clients.type.background')}
          </ToggleButton>
          <ToggleButton value="route">
            {t('options.clients.type.route')}
          </ToggleButton>
        </ToggleButtonGroup>
        {filteredClientCount > 0 ? (
          <Checkbox
            size="small"
            checked={allVisibleSelected}
            indeterminate={!allVisibleSelected && selectedCount > 0}
            onChange={(_event, checked) => onSelectAllVisible(checked)}
          />
        ) : null}
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
              <DeleteOutlineOutlined
                fontSize="small"
                sx={{ transform: 'rotate(45deg)' }}
              />
            </ToolbarIcon>
            <ToolbarIcon
              label={t('options.clients.favorite')}
              onClick={() => onApplyBulk('favorite')}
            >
              <StarOutlined fontSize="small" />
            </ToolbarIcon>
            <ToolbarIcon
              label={t('options.clients.unfavorite')}
              onClick={() => onApplyBulk('unfavorite')}
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
            >
              <DeleteOutlineOutlined fontSize="small" />
            </ToolbarIcon>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  )
}

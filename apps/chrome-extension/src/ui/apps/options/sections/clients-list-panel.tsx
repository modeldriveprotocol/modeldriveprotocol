import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined'
import StarOutlined from '@mui/icons-material/StarOutlined'
import WindowOutlined from '@mui/icons-material/WindowOutlined'
import {
  Button,
  Checkbox,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'

import {
  canCreateRouteClientFromUrl,
  matchesRouteClient,
  type BackgroundClientConfig,
  type ExtensionConfig,
  type RouteClientConfig
} from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { renderClientIcon } from '../../../foundation/client-icons.js'
import { useI18n } from '../../../i18n/provider.js'
import { ToolbarIcon } from '../shared.js'
import { uniqueEditableIds, type EditableClientId } from '../types.js'

type ClientListItem =
  | { kind: 'background'; id: 'background'; client: BackgroundClientConfig }
  | { kind: 'route'; id: string; client: RouteClientConfig }

export function ClientsListPanel({
  canCreateFromPage,
  currentPageUrl,
  draft,
  routeSearch,
  runtimeState,
  selectedClientId,
  onChange,
  onCreateClient,
  onCreateClientFromPage,
  onOpenDetail,
  onRouteSearchChange,
  onSelectClient
}: any) {
  const { t } = useI18n()
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(null)
  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'background' | 'route'>('all')
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ anchorEl: HTMLElement; ids: EditableClientId[]; names: string[] } | undefined>()
  const [selectedIds, setSelectedIds] = useState<EditableClientId[]>([])
  const backgroundRuntimeState = runtimeState?.clients.find((client: any) => client.kind === 'background')

  const filteredClients = useMemo(() => {
    const needle = routeSearch.trim().toLowerCase()
    const routeItems = draft.routeClients
      .filter((client: RouteClientConfig) => {
        if (!needle) return true
        const haystack = [client.clientName, client.clientId, client.matchPatterns.join(' '), client.skillEntries.map((skill) => skill.path).join(' ')].join(' ').toLowerCase()
        return haystack.includes(needle)
      })
      .map((client: RouteClientConfig) => ({ kind: 'route' as const, id: client.id, client }))

    const backgroundMatches =
      !needle ||
      ['background', draft.backgroundClient.clientName, draft.backgroundClient.clientId, draft.backgroundClient.clientDescription]
        .join(' ')
        .toLowerCase()
        .includes(needle)

    const items: ClientListItem[] = backgroundMatches
      ? [{ kind: 'background' as const, id: 'background' as const, client: draft.backgroundClient }, ...routeItems]
      : routeItems

    return items
      .filter((item: ClientListItem) => clientTypeFilter === 'all' || item.kind === clientTypeFilter)
      .sort((left: ClientListItem, right: ClientListItem) => {
        if (left.client.favorite !== right.client.favorite) {
          return left.client.favorite ? -1 : 1
        }
        if (left.kind !== right.kind) {
          return left.kind === 'background' ? -1 : 1
        }
        return left.client.clientName.localeCompare(right.client.clientName)
      })
  }, [clientTypeFilter, draft.backgroundClient, draft.routeClients, routeSearch])

  const selectedClientItem =
    filteredClients.find((item) => item.id === selectedClientId) ??
    filteredClients.find((item) => item.kind === 'route') ??
    filteredClients[0]

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredClients.some((item: ClientListItem) => item.id === id)))
  }, [filteredClients])

  function updateDraftClient(
    clientId: EditableClientId,
    updater: (current: BackgroundClientConfig | RouteClientConfig) => BackgroundClientConfig | RouteClientConfig
  ) {
    if (clientId === 'background') {
      onChange({ ...draft, backgroundClient: updater(draft.backgroundClient) as BackgroundClientConfig })
      return
    }
    onChange({
      ...draft,
      routeClients: draft.routeClients.map((client: RouteClientConfig) => (client.id === clientId ? (updater(client) as RouteClientConfig) : client))
    })
  }

  function requestDeleteClients(clientIds: EditableClientId[], anchorEl: HTMLElement) {
    const routeClients = draft.routeClients.filter((client: RouteClientConfig) => clientIds.includes(client.id))
    if (routeClients.length === 0) return
    setDeleteConfirmation({
      anchorEl,
      ids: routeClients.map((client: RouteClientConfig) => client.id),
      names: routeClients.map((client: RouteClientConfig) => client.clientName)
    })
  }

  function deleteClients(clientIds: EditableClientId[]) {
    const nextSelection = selectedClientId && clientIds.includes(selectedClientId) ? undefined : selectedClientId
    onChange({ ...draft, routeClients: draft.routeClients.filter((client: RouteClientConfig) => !clientIds.includes(client.id)) })
    setSelectedIds((current) => current.filter((id) => !clientIds.includes(id)))
    if (nextSelection !== selectedClientId) {
      onSelectClient(draft.routeClients.find((client: RouteClientConfig) => !clientIds.includes(client.id))?.id ?? 'background')
    }
  }

  function toggleSelected(clientId: EditableClientId, checked: boolean) {
    setSelectedIds((current) => (checked ? uniqueEditableIds([...current, clientId]) : current.filter((id) => id !== clientId)))
  }

  function applyBulk(action: 'enable' | 'disable' | 'favorite' | 'unfavorite') {
    if (selectedIds.length === 0) return
    const selectedSet = new Set(selectedIds)
    onChange({
      ...draft,
      backgroundClient: selectedSet.has('background')
        ? {
            ...draft.backgroundClient,
            ...(action === 'enable' ? { enabled: true } : {}),
            ...(action === 'disable' ? { enabled: false } : {}),
            ...(action === 'favorite' ? { favorite: true } : {}),
            ...(action === 'unfavorite' ? { favorite: false } : {})
          }
        : draft.backgroundClient,
      routeClients: draft.routeClients.map((client: RouteClientConfig) =>
        selectedSet.has(client.id)
          ? {
              ...client,
              ...(action === 'enable' ? { enabled: true } : {}),
              ...(action === 'disable' ? { enabled: false } : {}),
              ...(action === 'favorite' ? { favorite: true } : {}),
              ...(action === 'unfavorite' ? { favorite: false } : {})
            }
          : client
      )
    })
  }

  const allVisibleSelected = filteredClients.length > 0 && filteredClients.every((item: ClientListItem) => selectedIds.includes(item.id))
  const hasAnyRouteSelected = selectedIds.some((id) => id !== 'background')
  const deleteConfirmationDescription =
    (deleteConfirmation?.names.length ?? 0) > 1
      ? t('options.clients.confirmDelete.body.multiple', { count: deleteConfirmation?.names.length ?? 0 })
      : t('options.clients.confirmDelete.body.single', { name: deleteConfirmation?.names[0] ?? '' })

  return (
    <>
      <Stack spacing={1.25}>
        <Stack spacing={1} sx={{ px: 1.25, py: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TextField fullWidth size="small" placeholder={t('options.clients.search')} value={routeSearch} onChange={(event) => onRouteSearchChange(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }} />
            <Button variant="contained" onClick={(event) => setCreateMenuAnchor(event.currentTarget)} sx={{ minWidth: 40, px: 1.25 }}>
              <AddOutlined fontSize="small" />
            </Button>
          </Stack>
          <Menu anchorEl={createMenuAnchor} open={Boolean(createMenuAnchor)} onClose={() => setCreateMenuAnchor(null)}>
            <MenuItem onClick={() => { setCreateMenuAnchor(null); onCreateClient('route') }}>{t('options.clients.type.route')}</MenuItem>
            <MenuItem onClick={() => { setCreateMenuAnchor(null); onCreateClient('background') }}>{t('options.clients.type.background')}</MenuItem>
            <MenuItem disabled={!canCreateFromPage} onClick={() => { setCreateMenuAnchor(null); onCreateClientFromPage() }}>{t('options.clients.addFromPage')}</MenuItem>
          </Menu>

          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <ToggleButtonGroup exclusive size="small" value={clientTypeFilter} onChange={(_event, nextValue) => nextValue && setClientTypeFilter(nextValue)}>
              <ToggleButton value="all">{t('options.clients.filter.all')}</ToggleButton>
              <ToggleButton value="background">{t('options.clients.type.background')}</ToggleButton>
              <ToggleButton value="route">{t('options.clients.type.route')}</ToggleButton>
            </ToggleButtonGroup>
            {filteredClients.length > 0 ? <Checkbox size="small" checked={allVisibleSelected} indeterminate={!allVisibleSelected && selectedIds.length > 0} onChange={(_event, checked) => setSelectedIds(checked ? filteredClients.map((item: ClientListItem) => item.id) : [])} /> : null}
          </Stack>

          {selectedIds.length > 0 ? (
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Typography variant="caption" color="text.secondary">{t('options.clients.selected', { count: selectedIds.length })}</Typography>
              <Stack direction="row" spacing={0.5}>
                <ToolbarIcon label={t('options.clients.enable')} onClick={() => applyBulk('enable')}><WindowOutlined fontSize="small" /></ToolbarIcon>
                <ToolbarIcon label={t('options.clients.disable')} onClick={() => applyBulk('disable')}><DeleteOutlineOutlined fontSize="small" sx={{ transform: 'rotate(45deg)' }} /></ToolbarIcon>
                <ToolbarIcon label={t('options.clients.favorite')} onClick={() => applyBulk('favorite')}><StarOutlined fontSize="small" /></ToolbarIcon>
                <ToolbarIcon label={t('options.clients.unfavorite')} onClick={() => applyBulk('unfavorite')}><StarBorderOutlined fontSize="small" /></ToolbarIcon>
                <ToolbarIcon label={t('options.clients.delete')} onClick={(event) => requestDeleteClients(selectedIds.filter((id) => id !== 'background'), event.currentTarget)} disabled={!hasAnyRouteSelected}><DeleteOutlineOutlined fontSize="small" /></ToolbarIcon>
              </Stack>
            </Stack>
          ) : null}
        </Stack>

        <Divider />

        <List dense disablePadding sx={{ px: 0.75, py: 0.5 }}>
          {filteredClients.length === 0 ? (
            <ListItem disablePadding sx={{ px: 1.25, py: 1.5 }}>
              <ListItemText primary={t('options.clients.emptySearch')} secondary={t('options.clients.emptySearchHint')} primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }} />
            </ListItem>
          ) : filteredClients.map((item: ClientListItem) => {
            const matched = item.kind === 'route' ? Boolean(currentPageUrl && canCreateRouteClientFromUrl(currentPageUrl) && matchesRouteClient(currentPageUrl, item.client)) : false
            return (
              <ListItem key={item.id} disablePadding>
                <ListItemButton selected={selectedClientId === item.id} onClick={() => { onSelectClient(item.id); onOpenDetail(item.id) }} sx={{ minHeight: 60, px: 1.25, py: 0.75, alignItems: 'center', borderLeft: '2px solid', borderLeftColor: selectedClientItem?.id === item.id ? 'primary.main' : 'transparent' }}>
                  <Checkbox edge="start" size="small" checked={selectedIds.includes(item.id)} onClick={(event) => event.stopPropagation()} onChange={(_event, checked) => toggleSelected(item.id, checked)} sx={{ mr: 0.5 }} />
                  <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{renderClientIcon(item.client.icon)}</ListItemIcon>
                  <ListItemText primary={item.client.clientName} secondary={item.kind === 'background' ? t('options.clients.type.background') : t('options.clients.type.route')} primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }} secondaryTypographyProps={{ variant: 'caption', noWrap: true, color: matched || backgroundRuntimeState?.connectionState === 'connected' ? 'success.main' : 'text.secondary' }} />
                  <Stack direction="row" spacing={0.25} sx={{ pl: 1 }} onClick={(event) => event.stopPropagation()}>
                    <ToolbarIcon label={item.client.favorite ? t('options.clients.unfavorite') : t('options.clients.favorite')} onClick={() => updateDraftClient(item.id, (client) => ({ ...client, favorite: !client.favorite }))}>
                      {item.client.favorite ? <StarOutlined fontSize="small" /> : <StarBorderOutlined fontSize="small" />}
                    </ToolbarIcon>
                    <Switch size="small" checked={item.client.enabled} onChange={(_event, checked) => updateDraftClient(item.id, (client) => ({ ...client, enabled: checked }))} />
                    {item.kind === 'route' ? <ToolbarIcon label={t('options.clients.delete')} onClick={(event) => requestDeleteClients([item.id], event.currentTarget)}><DeleteOutlineOutlined fontSize="small" /></ToolbarIcon> : null}
                  </Stack>
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Stack>

      <Popover open={Boolean(deleteConfirmation)} anchorEl={deleteConfirmation?.anchorEl ?? null} onClose={() => setDeleteConfirmation(undefined)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Stack spacing={1} sx={{ p: 1.25, maxWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('options.clients.confirmDelete.title')}</Typography>
          <Typography variant="body2">{deleteConfirmationDescription}</Typography>
          <Typography variant="caption" color="text.secondary">{t('options.clients.confirmDelete.hint')}</Typography>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 0.5 }}>
            <Button size="small" onClick={() => setDeleteConfirmation(undefined)}>{t('options.clients.confirmDelete.cancel')}</Button>
            <Button size="small" color="error" variant="contained" onClick={() => { if (deleteConfirmation) { deleteClients(deleteConfirmation.ids); setDeleteConfirmation(undefined) } }}>{t('options.clients.confirmDelete.confirm')}</Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  )
}

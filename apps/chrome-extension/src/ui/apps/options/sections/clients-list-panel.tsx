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
  isRequiredBackgroundClientId,
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
  | { kind: 'background'; id: string; client: BackgroundClientConfig }
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
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(
    null
  )
  const [clientTypeFilter, setClientTypeFilter] = useState<
    'all' | 'background' | 'route'
  >('all')
  const [deleteConfirmation, setDeleteConfirmation] = useState<
    | { anchorEl: HTMLElement; ids: EditableClientId[]; names: string[] }
    | undefined
  >()
  const [selectedIds, setSelectedIds] = useState<EditableClientId[]>([])

  const filteredClients = useMemo(() => {
    const needle = routeSearch.trim().toLowerCase()
    const backgroundItems = draft.backgroundClients
      .filter((client: BackgroundClientConfig) => {
        if (!needle) return true
        const haystack = [
          'background',
          client.clientName,
          client.clientId,
          client.clientDescription
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(needle)
      })
      .map((client: BackgroundClientConfig) => ({
        kind: 'background' as const,
        id: client.id,
        client
      }))
    const routeItems = draft.routeClients
      .filter((client: RouteClientConfig) => {
        if (!needle) return true
        const haystack = [
          client.clientName,
          client.clientId,
          client.matchPatterns.join(' '),
          client.skillFolders.map((folder) => folder.path).join(' '),
          client.skillEntries.map((skill) => skill.path).join(' ')
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(needle)
      })
      .map((client: RouteClientConfig) => ({
        kind: 'route' as const,
        id: client.id,
        client
      }))

    const items: ClientListItem[] = [...backgroundItems, ...routeItems]

    return items
      .filter(
        (item: ClientListItem) =>
          clientTypeFilter === 'all' || item.kind === clientTypeFilter
      )
      .sort((left: ClientListItem, right: ClientListItem) => {
        if (left.client.favorite !== right.client.favorite) {
          return left.client.favorite ? -1 : 1
        }
        if (left.kind !== right.kind) {
          return left.kind === 'background' ? -1 : 1
        }
        return left.client.clientName.localeCompare(right.client.clientName)
      })
  }, [
    clientTypeFilter,
    draft.backgroundClients,
    draft.routeClients,
    routeSearch
  ])

  const selectedClientItem =
    filteredClients.find((item) => item.id === selectedClientId) ??
    filteredClients.find((item) => item.kind === 'route') ??
    filteredClients[0]

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) =>
        filteredClients.some((item: ClientListItem) => item.id === id)
      )
    )
  }, [filteredClients])

  function updateDraftClient(
    clientId: EditableClientId,
    updater: (
      current: BackgroundClientConfig | RouteClientConfig
    ) => BackgroundClientConfig | RouteClientConfig
  ) {
    if (
      draft.backgroundClients.some(
        (client: BackgroundClientConfig) => client.id === clientId
      )
    ) {
      onChange({
        ...draft,
        backgroundClients: draft.backgroundClients.map(
          (client: BackgroundClientConfig) =>
            client.id === clientId
              ? (updater(client) as BackgroundClientConfig)
              : client
        )
      })
      return
    }
    onChange({
      ...draft,
      routeClients: draft.routeClients.map((client: RouteClientConfig) =>
        client.id === clientId ? (updater(client) as RouteClientConfig) : client
      )
    })
  }

  function requestDeleteClients(
    clientIds: EditableClientId[],
    anchorEl: HTMLElement
  ) {
    const backgroundClients = draft.backgroundClients.filter(
      (client: BackgroundClientConfig) => clientIds.includes(client.id)
    )
    const routeClients = draft.routeClients.filter(
      (client: RouteClientConfig) => clientIds.includes(client.id)
    )
    if (backgroundClients.length === 0 && routeClients.length === 0) return
    if (
      backgroundClients.some((client: BackgroundClientConfig) =>
        isRequiredBackgroundClientId(client.id)
      )
    ) {
      return
    }
    if (
      backgroundClients.length > 0 &&
      draft.backgroundClients.filter(
        (client: BackgroundClientConfig) => !clientIds.includes(client.id)
      ).length === 0
    ) {
      return
    }
    setDeleteConfirmation({
      anchorEl,
      ids: [
        ...backgroundClients.map((client: BackgroundClientConfig) => client.id),
        ...routeClients.map((client: RouteClientConfig) => client.id)
      ],
      names: [
        ...backgroundClients.map(
          (client: BackgroundClientConfig) => client.clientName
        ),
        ...routeClients.map((client: RouteClientConfig) => client.clientName)
      ]
    })
  }

  function deleteClients(clientIds: EditableClientId[]) {
    const nextSelection =
      selectedClientId && clientIds.includes(selectedClientId)
        ? undefined
        : selectedClientId
    const nextDraft = {
      ...draft,
      backgroundClients: draft.backgroundClients.filter(
        (client: BackgroundClientConfig) => !clientIds.includes(client.id)
      ),
      routeClients: draft.routeClients.filter(
        (client: RouteClientConfig) => !clientIds.includes(client.id)
      )
    }
    onChange(nextDraft)
    setSelectedIds((current) => current.filter((id) => !clientIds.includes(id)))
    if (nextSelection !== selectedClientId) {
      const nextClient =
        nextDraft.routeClients[0]?.id ?? nextDraft.backgroundClients[0]?.id
      if (nextClient) {
        onSelectClient(nextClient)
      }
    }
  }

  function toggleSelected(clientId: EditableClientId, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? uniqueEditableIds([...current, clientId])
        : current.filter((id) => id !== clientId)
    )
  }

  function applyBulk(action: 'enable' | 'disable' | 'favorite' | 'unfavorite') {
    if (selectedIds.length === 0) return
    const selectedSet = new Set(selectedIds)
    onChange({
      ...draft,
      backgroundClients: draft.backgroundClients.map(
        (client: BackgroundClientConfig) =>
          selectedSet.has(client.id)
            ? {
                ...client,
                ...(action === 'enable' ? { enabled: true } : {}),
                ...(action === 'disable' ? { enabled: false } : {}),
                ...(action === 'favorite' ? { favorite: true } : {}),
                ...(action === 'unfavorite' ? { favorite: false } : {})
              }
            : client
      ),
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

  const allVisibleSelected =
    filteredClients.length > 0 &&
    filteredClients.every((item: ClientListItem) =>
      selectedIds.includes(item.id)
    )
  const selectedBackgroundIds = selectedIds.filter((id) =>
    draft.backgroundClients.some(
      (client: BackgroundClientConfig) => client.id === id
    )
  )
  const nextBackgroundCount =
    draft.backgroundClients.length - selectedBackgroundIds.length
  const includesRequiredBackgroundClient = selectedBackgroundIds.some((id) =>
    isRequiredBackgroundClientId(id)
  )
  const canDeleteSelection =
    selectedIds.length > 0 &&
    !includesRequiredBackgroundClient &&
    (selectedBackgroundIds.length === 0 || nextBackgroundCount > 0)
  const deleteConfirmationDescription =
    (deleteConfirmation?.names.length ?? 0) > 1
      ? t('options.clients.confirmDelete.body.multiple', {
          count: deleteConfirmation?.names.length ?? 0
        })
      : t('options.clients.confirmDelete.body.single', {
          name: deleteConfirmation?.names[0] ?? ''
        })

  return (
    <>
      <Stack spacing={1.25}>
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
              onChange={(_event, nextValue) =>
                nextValue && setClientTypeFilter(nextValue)
              }
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
            {filteredClients.length > 0 ? (
              <Checkbox
                size="small"
                checked={allVisibleSelected}
                indeterminate={!allVisibleSelected && selectedIds.length > 0}
                onChange={(_event, checked) =>
                  setSelectedIds(
                    checked
                      ? filteredClients.map((item: ClientListItem) => item.id)
                      : []
                  )
                }
              />
            ) : null}
          </Stack>

          {selectedIds.length > 0 ? (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Typography variant="caption" color="text.secondary">
                {t('options.clients.selected', { count: selectedIds.length })}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <ToolbarIcon
                  label={t('options.clients.enable')}
                  onClick={() => applyBulk('enable')}
                >
                  <WindowOutlined fontSize="small" />
                </ToolbarIcon>
                <ToolbarIcon
                  label={t('options.clients.disable')}
                  onClick={() => applyBulk('disable')}
                >
                  <DeleteOutlineOutlined
                    fontSize="small"
                    sx={{ transform: 'rotate(45deg)' }}
                  />
                </ToolbarIcon>
                <ToolbarIcon
                  label={t('options.clients.favorite')}
                  onClick={() => applyBulk('favorite')}
                >
                  <StarOutlined fontSize="small" />
                </ToolbarIcon>
                <ToolbarIcon
                  label={t('options.clients.unfavorite')}
                  onClick={() => applyBulk('unfavorite')}
                >
                  <StarBorderOutlined fontSize="small" />
                </ToolbarIcon>
                <ToolbarIcon
                  label={t('options.clients.delete')}
                  onClick={(event) =>
                    requestDeleteClients(selectedIds, event.currentTarget)
                  }
                  disabled={!canDeleteSelection}
                >
                  <DeleteOutlineOutlined fontSize="small" />
                </ToolbarIcon>
              </Stack>
            </Stack>
          ) : null}
        </Stack>

        <Divider />

        <List dense disablePadding sx={{ py: 0.5 }}>
          {filteredClients.length === 0 ? (
            <ListItem disablePadding sx={{ px: 1.25, py: 1.5 }}>
              <ListItemText
                primary={t('options.clients.emptySearch')}
                secondary={t('options.clients.emptySearchHint')}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ) : (
            filteredClients.map((item: ClientListItem) => {
              const matched =
                item.kind === 'route'
                  ? Boolean(
                      currentPageUrl &&
                        canCreateRouteClientFromUrl(currentPageUrl) &&
                        matchesRouteClient(currentPageUrl, item.client)
                    )
                  : false
              const runtimeClientState = runtimeState?.clients.find(
                (client: any) =>
                  client.kind === item.kind && client.id === item.id
              )
              const hasMatchingOpenTab =
                item.kind === 'route'
                  ? (runtimeClientState?.matchingTabCount ?? 0) > 0
                  : false
              const secondaryTone =
                item.kind === 'route'
                  ? matched || hasMatchingOpenTab
                    ? 'success.main'
                    : 'text.secondary'
                  : runtimeClientState?.connectionState === 'connected'
                    ? 'success.main'
                    : 'text.secondary'
              const secondaryText =
                item.kind === 'background'
                  ? t('options.clients.type.background')
                  : [
                      t('options.clients.type.route'),
                      matched
                        ? t('options.clients.match')
                        : hasMatchingOpenTab
                          ? `${t('options.clients.active')} · ${t(
                              'options.clients.openTabs',
                              {
                                count: runtimeClientState?.matchingTabCount ?? 0
                              }
                            )}`
                          : t('options.clients.idle')
                    ].join(' · ')
              return (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    selected={selectedClientId === item.id}
                    onClick={() => {
                      onSelectClient(item.id)
                      onOpenDetail(item.id)
                    }}
                    sx={{
                      minHeight: 60,
                      px: 1.25,
                      py: 0.75,
                      alignItems: 'center',
                      borderLeft: '2px solid',
                      borderLeftColor:
                        selectedClientItem?.id === item.id
                          ? 'primary.main'
                          : 'transparent'
                    }}
                  >
                    <Checkbox
                      edge="start"
                      size="small"
                      checked={selectedIds.includes(item.id)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(_event, checked) =>
                        toggleSelected(item.id, checked)
                      }
                      sx={{ mr: 0.5 }}
                    />
                    <ListItemIcon
                      sx={{ minWidth: 32, color: 'text.secondary' }}
                    >
                      {renderClientIcon(item.client.icon)}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.client.clientName}
                      secondary={secondaryText}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 600,
                        noWrap: true
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        noWrap: true,
                        color: secondaryTone
                      }}
                    />
                    <Stack
                      direction="row"
                      spacing={0.25}
                      sx={{ pl: 1 }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ToolbarIcon
                        label={
                          item.client.favorite
                            ? t('options.clients.unfavorite')
                            : t('options.clients.favorite')
                        }
                        onClick={() =>
                          updateDraftClient(item.id, (client) => ({
                            ...client,
                            favorite: !client.favorite
                          }))
                        }
                      >
                        {item.client.favorite ? (
                          <StarOutlined fontSize="small" />
                        ) : (
                          <StarBorderOutlined fontSize="small" />
                        )}
                      </ToolbarIcon>
                      <Switch
                        size="small"
                        checked={item.client.enabled}
                        onChange={(_event, checked) =>
                          updateDraftClient(item.id, (client) => ({
                            ...client,
                            enabled: checked
                          }))
                        }
                      />
                      {item.kind === 'route' ||
                      draft.backgroundClients.length > 1 ? (
                        <ToolbarIcon
                          label={t('options.clients.delete')}
                          onClick={(event) =>
                            requestDeleteClients([item.id], event.currentTarget)
                          }
                          disabled={
                            (item.kind === 'background' &&
                              (draft.backgroundClients.length <= 1 ||
                                isRequiredBackgroundClientId(item.id)))
                          }
                        >
                          <DeleteOutlineOutlined fontSize="small" />
                        </ToolbarIcon>
                      ) : null}
                    </Stack>
                  </ListItemButton>
                </ListItem>
              )
            })
          )}
        </List>
      </Stack>

      <Popover
        open={Boolean(deleteConfirmation)}
        anchorEl={deleteConfirmation?.anchorEl ?? null}
        onClose={() => setDeleteConfirmation(undefined)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack spacing={1} sx={{ p: 1.25, maxWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('options.clients.confirmDelete.title')}
          </Typography>
          <Typography variant="body2">
            {deleteConfirmationDescription}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('options.clients.confirmDelete.hint')}
          </Typography>
          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={1}
            sx={{ pt: 0.5 }}
          >
            <Button
              size="small"
              onClick={() => setDeleteConfirmation(undefined)}
            >
              {t('options.clients.confirmDelete.cancel')}
            </Button>
            <Button
              size="small"
              color="error"
              variant="contained"
              onClick={() => {
                if (deleteConfirmation) {
                  deleteClients(deleteConfirmation.ids)
                  setDeleteConfirmation(undefined)
                }
              }}
            >
              {t('options.clients.confirmDelete.confirm')}
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  )
}

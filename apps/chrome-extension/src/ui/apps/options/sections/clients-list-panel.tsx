import { List, ListItem, ListItemText, Stack } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import type {
  BackgroundClientConfig,
  RouteClientConfig
} from '#~/shared/config.js'
import { useI18n } from '../../../i18n/provider.js'
import { forkEditableClient } from '../editable-client-copy.js'
import { uniqueEditableIds, type EditableClientId } from '../types.js'
import { ClientRow } from './clients-list-panel/client-row.js'
import { ClientsDeletePopover } from './clients-list-panel/delete-popover.js'
import {
  buildFilteredClientItems,
  pruneInvisibleSelectedIds
} from './clients-list-panel/filtering.js'
import {
  applyBulkClientAction,
  buildDeleteConfirmation,
  canDeleteClientSelection,
  deleteClientsFromDraft,
  updateClientInDraft
} from './clients-list-panel/mutations.js'
import { ClientsListToolbar } from './clients-list-panel/toolbar.js'
import type {
  ClientTypeFilter,
  ClientsListPanelProps,
  DeleteConfirmationState
} from './clients-list-panel/types.js'

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
}: ClientsListPanelProps) {
  const { t } = useI18n()
  const [clientTypeFilter, setClientTypeFilter] =
    useState<ClientTypeFilter>('all')
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmationState>()
  const [selectedIds, setSelectedIds] = useState<EditableClientId[]>([])
  const [controlsExpanded, setControlsExpanded] = useState(false)

  const filteredClients = useMemo(
    () =>
      buildFilteredClientItems({
        clientTypeFilter,
        draft,
        routeSearch
      }),
    [clientTypeFilter, draft, routeSearch]
  )

  useEffect(() => {
    setSelectedIds((current) => pruneInvisibleSelectedIds(current, filteredClients))
  }, [filteredClients])

  function updateDraftClient(
    clientId: EditableClientId,
    updater: (
      current: BackgroundClientConfig | RouteClientConfig
    ) => BackgroundClientConfig | RouteClientConfig
  ) {
    onChange(updateClientInDraft(draft, clientId, updater))
  }

  function requestDeleteClients(
    clientIds: EditableClientId[],
    anchorEl: HTMLElement
  ) {
    const nextConfirmation = buildDeleteConfirmation(draft, clientIds, anchorEl)

    if (nextConfirmation) {
      setDeleteConfirmation(nextConfirmation)
    }
  }

  function deleteClients(clientIds: EditableClientId[]) {
    const nextSelection =
      selectedClientId && clientIds.includes(selectedClientId)
        ? undefined
        : selectedClientId
    const nextDraft = deleteClientsFromDraft(draft, clientIds)

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
    onChange(applyBulkClientAction(draft, selectedIds, action))
  }

  function duplicateClient(item: (typeof filteredClients)[number]) {
    if (item.kind === 'background') {
      const nextClient = forkEditableClient(item, t)

      onChange({
        ...draft,
        backgroundClients: [...draft.backgroundClients, nextClient]
      })
      onSelectClient(nextClient.id)
      onOpenDetail(nextClient.id)
      return
    }

    const nextClient = forkEditableClient(item, t)

    onChange({
      ...draft,
      routeClients: [...draft.routeClients, nextClient]
    })
    onSelectClient(nextClient.id)
    onOpenDetail(nextClient.id)
  }

  function toggleControlsExpanded() {
    setControlsExpanded((current) => {
      const next = !current

      if (!next) {
        setClientTypeFilter('all')
        setSelectedIds([])
      }

      return next
    })
  }

  const allVisibleSelected =
    filteredClients.length > 0 &&
    filteredClients.every((item) => selectedIds.includes(item.id))
  const canDeleteSelection = canDeleteClientSelection(draft, selectedIds)
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
      <Stack spacing={0}>
        <ClientsListToolbar
          allVisibleSelected={allVisibleSelected}
          canCreateFromPage={canCreateFromPage}
          canDeleteSelection={canDeleteSelection}
          clientTypeFilter={clientTypeFilter}
          controlsExpanded={controlsExpanded}
          filteredClientCount={filteredClients.length}
          onApplyBulk={applyBulk}
          onCreateClient={onCreateClient}
          onCreateClientFromPage={onCreateClientFromPage}
          onFilterChange={setClientTypeFilter}
          onRequestDeleteSelection={(anchorEl) =>
            requestDeleteClients(selectedIds, anchorEl)
          }
          onRouteSearchChange={onRouteSearchChange}
          onSelectAllVisible={(checked) =>
            setSelectedIds(
              checked ? filteredClients.map((item) => item.id) : []
            )
          }
          onToggleControlsExpanded={toggleControlsExpanded}
          routeSearch={routeSearch}
          selectedCount={selectedIds.length}
          t={t}
        />

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
            filteredClients.map((item) => (
              <ClientRow
                key={item.id}
                currentPageUrl={currentPageUrl}
                draftBackgroundClientCount={draft.backgroundClients.length}
                isChecked={selectedIds.includes(item.id)}
                isSelected={selectedClientId === item.id}
                item={item}
                onOpenDetail={onOpenDetail}
                onRequestDelete={(clientId, anchorEl) =>
                  requestDeleteClients([clientId], anchorEl)
                }
                onSelectClient={onSelectClient}
                onToggleEnabled={(clientId, checked) =>
                  updateDraftClient(clientId, (client) => ({
                    ...client,
                    enabled: checked
                  }))
                }
                onToggleFavorite={(clientId) =>
                  updateDraftClient(clientId, (client) => ({
                    ...client,
                    favorite: !client.favorite
                  }))
                }
                onTogglePinned={(clientId) =>
                  updateDraftClient(clientId, (client) => ({
                    ...client,
                    pinned: !client.pinned
                  }))
                }
                onToggleSelected={toggleSelected}
                onDuplicateClient={duplicateClient}
                selectionMode={controlsExpanded}
                runtimeState={runtimeState}
                t={t}
              />
            ))
          )}
        </List>
      </Stack>

      <ClientsDeletePopover
        confirmation={deleteConfirmation}
        description={deleteConfirmationDescription}
        onCancel={() => setDeleteConfirmation(undefined)}
        onConfirm={() => {
          if (deleteConfirmation) {
            deleteClients(deleteConfirmation.ids)
            setDeleteConfirmation(undefined)
          }
        }}
        t={t}
      />
    </>
  )
}

import {
  isRequiredBackgroundClientId,
  type BackgroundClientConfig,
  type ExtensionConfig,
  type RouteClientConfig
} from '#~/shared/config.js'
import type { EditableClientId } from '../../types.js'
import type {
  BulkClientAction,
  DeleteConfirmationState
} from './types.js'

export function updateClientInDraft(
  draft: ExtensionConfig,
  clientId: EditableClientId,
  updater: (
    current: BackgroundClientConfig | RouteClientConfig
  ) => BackgroundClientConfig | RouteClientConfig
): ExtensionConfig {
  if (draft.backgroundClients.some((client) => client.id === clientId)) {
    return {
      ...draft,
      backgroundClients: draft.backgroundClients.map((client) =>
        client.id === clientId
          ? (updater(client) as BackgroundClientConfig)
          : client
      )
    }
  }

  return {
    ...draft,
    routeClients: draft.routeClients.map((client) =>
      client.id === clientId ? (updater(client) as RouteClientConfig) : client
    )
  }
}

export function buildDeleteConfirmation(
  draft: ExtensionConfig,
  clientIds: EditableClientId[],
  anchorEl: HTMLElement
): DeleteConfirmationState | undefined {
  const backgroundClients = draft.backgroundClients.filter((client) =>
    clientIds.includes(client.id)
  )
  const routeClients = draft.routeClients.filter((client) =>
    clientIds.includes(client.id)
  )

  if (backgroundClients.length === 0 && routeClients.length === 0) {
    return undefined
  }

  if (
    backgroundClients.some((client) => isRequiredBackgroundClientId(client.id))
  ) {
    return undefined
  }

  if (
    backgroundClients.length > 0 &&
    draft.backgroundClients.filter((client) => !clientIds.includes(client.id))
      .length === 0
  ) {
    return undefined
  }

  return {
    anchorEl,
    ids: [...backgroundClients, ...routeClients].map((client) => client.id),
    names: [...backgroundClients, ...routeClients].map(
      (client) => client.clientName
    )
  }
}

export function deleteClientsFromDraft(
  draft: ExtensionConfig,
  clientIds: EditableClientId[]
): ExtensionConfig {
  return {
    ...draft,
    backgroundClients: draft.backgroundClients.filter(
      (client) => !clientIds.includes(client.id)
    ),
    routeClients: draft.routeClients.filter(
      (client) => !clientIds.includes(client.id)
    )
  }
}

export function applyBulkClientAction(
  draft: ExtensionConfig,
  clientIds: EditableClientId[],
  action: BulkClientAction
): ExtensionConfig {
  if (clientIds.length === 0) {
    return draft
  }

  const selectedSet = new Set(clientIds)

  return {
    ...draft,
    backgroundClients: draft.backgroundClients.map((client) =>
      selectedSet.has(client.id) &&
      !(
        isRequiredBackgroundClientId(client.id) &&
        (action === 'enable' || action === 'disable')
      )
        ? {
            ...client,
            ...(action === 'enable' ? { enabled: true } : {}),
            ...(action === 'disable' ? { enabled: false } : {}),
            ...(action === 'favorite' ? { favorite: true } : {}),
            ...(action === 'unfavorite' ? { favorite: false } : {})
          }
        : client
    ),
    routeClients: draft.routeClients.map((client) =>
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
  }
}

export function canDeleteClientSelection(
  draft: ExtensionConfig,
  selectedIds: EditableClientId[]
): boolean {
  const selectedBackgroundIds = selectedIds.filter((id) =>
    draft.backgroundClients.some((client) => client.id === id)
  )
  const nextBackgroundCount =
    draft.backgroundClients.length - selectedBackgroundIds.length
  const includesRequiredBackgroundClient = selectedBackgroundIds.some((id) =>
    isRequiredBackgroundClientId(id)
  )

  return (
    selectedIds.length > 0 &&
    !includesRequiredBackgroundClient &&
    (selectedBackgroundIds.length === 0 || nextBackgroundCount > 0)
  )
}

import {
  getRouteClientSkillEntries,
  getRouteClientSkillFolders,
  type BackgroundClientConfig,
  type ExtensionConfig,
  type RouteClientConfig
} from '#~/shared/config.js'
import type { EditableClientId } from '../../types.js'
import type {
  ClientListItem,
  ClientTypeFilter
} from './types.js'

export function buildFilteredClientItems({
  clientTypeFilter,
  draft,
  routeSearch
}: {
  clientTypeFilter: ClientTypeFilter
  draft: ExtensionConfig
  routeSearch: string
}): ClientListItem[] {
  const needle = routeSearch.trim().toLowerCase()
  const items: ClientListItem[] = [
    ...draft.backgroundClients
      .filter((client) => matchesBackgroundClientSearch(client, needle))
      .map((client) => ({
        kind: 'background' as const,
        id: client.id,
        client
      })),
    ...draft.routeClients
      .filter((client) => matchesRouteClientSearch(client, needle))
      .map((client) => ({
        kind: 'route' as const,
        id: client.id,
        client
      }))
  ]

  return items
    .filter(
      (item) => clientTypeFilter === 'all' || item.kind === clientTypeFilter
    )
    .sort(compareClientItems)
}

export function pruneInvisibleSelectedIds(
  current: EditableClientId[],
  visibleItems: ClientListItem[]
): EditableClientId[] {
  return current.filter((id) => visibleItems.some((item) => item.id === id))
}

function matchesBackgroundClientSearch(
  client: BackgroundClientConfig,
  needle: string
): boolean {
  if (!needle) {
    return true
  }

  return [
    'background',
    client.clientName,
    client.clientId,
    client.clientDescription
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

function matchesRouteClientSearch(
  client: RouteClientConfig,
  needle: string
): boolean {
  if (!needle) {
    return true
  }

  return [
    client.clientName,
    client.clientId,
    client.matchPatterns.join(' '),
    client.exposes.map((asset) => asset.path).join(' '),
    getRouteClientSkillFolders(client)
      .map((folder) => folder.path)
      .join(' '),
    getRouteClientSkillEntries(client)
      .map((skill) => skill.path)
      .join(' ')
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

function compareClientItems(
  left: ClientListItem,
  right: ClientListItem
): number {
  if (left.client.pinned !== right.client.pinned) {
    return left.client.pinned ? -1 : 1
  }

  if (left.client.favorite !== right.client.favorite) {
    return left.client.favorite ? -1 : 1
  }

  if (left.kind !== right.kind) {
    return left.kind === 'background' ? -1 : 1
  }

  return left.client.clientName.localeCompare(right.client.clientName)
}

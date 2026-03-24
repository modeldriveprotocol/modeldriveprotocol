import type { ReactNode } from 'react'

import type { PopupClientState, PopupState } from '#~/background/shared.js'
import type {
  MarketCatalogClientEntry,
  MarketCatalogSourceData,
  MarketCatalogSourceResult
} from '../../market/catalog.js'

import type { useI18n } from '../../i18n/provider.js'
import type {
  FlashState,
  RouteClientPrimaryActionKind,
  SidepanelClientFilter
} from './helpers.js'

export type TranslateFn = ReturnType<typeof useI18n>['t']

export type SidepanelClientEntry = {
  client: PopupClientState
  listId: string
  priority: number
  searchText: string
  type: SidepanelClientFilter
}

export type SidepanelContentMode = 'clients' | 'market'

export type SidepanelMarketEntry = {
  key: string
  catalog: MarketCatalogSourceData
  entry: MarketCatalogClientEntry
  localCount: number
  searchText: string
}

export type PopupActionDescriptor = {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}

export type RouteClientPrimaryActionDescriptor = PopupActionDescriptor & {
  kind: RouteClientPrimaryActionKind
}

export type PopupRuntimeSlice = {
  state: PopupState | undefined
  loading: boolean
  error: string | undefined
  flash: FlashState | undefined
  recordingName: string
  recordingDescription: string
  setRecordingName: (value: string) => void
  setRecordingDescription: (value: string) => void
  runAction: (
    label: string,
    action: () => Promise<void>,
    options?: {
      suggestSelectedClientPrimary?: boolean
    }
  ) => Promise<void>
}

export type SidepanelController = PopupRuntimeSlice & {
  t: TranslateFn
  backgroundClients: PopupClientState[]
  pageRouteClients: PopupClientState[]
  filteredSidepanelClients: SidepanelClientEntry[]
  contentMode: SidepanelContentMode
  setContentMode: (value: SidepanelContentMode) => void
  relatedRouteClients: PopupState['config']['routeClients']
  marketCatalogs: MarketCatalogSourceResult[]
  marketEntries: SidepanelMarketEntry[]
  marketLoading: boolean
  marketLoadError: string | undefined
  marketSearch: string
  setMarketSearch: (value: string) => void
  refreshMarketCatalogs: () => void
  installMarketClient: (
    catalog: MarketCatalogSourceData,
    entry: MarketCatalogClientEntry
  ) => Promise<void>
  selectedClient: PopupClientState | undefined
  selectedRouteConfig: PopupState['config']['routeClients'][number] | undefined
  selectedOptionsClientId: string | undefined
  activeTabHasPermission: boolean
  canCreateFromActivePage: boolean
  clientFilter: SidepanelClientFilter
  setClientFilter: (value: SidepanelClientFilter) => void
  clientSearch: string
  setClientSearch: (value: string) => void
  expandedClientKey: string | undefined
  setExpandedClientKey: (value: string | undefined) => void
  setSelectedClientId: (value: string | undefined) => void
  sidepanelPrimaryAction: PopupActionDescriptor
  sidepanelFocusText: string
  errorRecoveryAction:
    | {
        label: string
        onClick: () => void
      }
    | undefined
  successFollowUpAction: RouteClientPrimaryActionDescriptor | undefined
  buildRouteClientPrimaryAction: (client: PopupClientState) => RouteClientPrimaryActionDescriptor
}

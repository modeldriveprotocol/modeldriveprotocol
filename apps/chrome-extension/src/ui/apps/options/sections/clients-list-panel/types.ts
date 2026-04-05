import type {
  BackgroundClientConfig,
  ExtensionConfig,
  RouteClientConfig
} from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import type { EditableClientId } from '../../types.js'

export type ClientListItem =
  | { kind: 'background'; id: string; client: BackgroundClientConfig }
  | { kind: 'route'; id: string; client: RouteClientConfig }

export type ClientTypeFilter = 'all' | 'background' | 'route'

export type BulkClientAction =
  | 'enable'
  | 'disable'
  | 'favorite'
  | 'unfavorite'

export type DeleteConfirmationState = {
  anchorEl: HTMLElement
  ids: EditableClientId[]
  names: string[]
}

export type ClientsListPanelProps = {
  canCreateFromPage: boolean
  currentPageUrl: string | undefined
  draft: ExtensionConfig
  routeSearch: string
  runtimeState: PopupState | undefined
  selectedClientId: EditableClientId | undefined
  onChange: (config: ExtensionConfig) => void
  onCreateClient: (kind: 'background' | 'route') => void
  onCreateClientFromPage: () => void
  onOpenDetail: (clientId: EditableClientId) => void
  onRouteSearchChange: (value: string) => void
  onSelectClient: (clientId: EditableClientId) => void
}

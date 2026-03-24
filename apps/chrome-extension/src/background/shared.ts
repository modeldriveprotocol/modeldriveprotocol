import type {
  ClientIconKey,
  ExtensionConfig,
  RouteClientConfig,
  RouteSelectorResource
} from '#~/shared/config.js'
import type { MarketSourcePendingUpdate } from '#~/shared/storage.js'
import { asRecord, createStableId, readNumber, readString } from '#~/shared/utils.js'
import type { InjectedToolDescriptor, MainWorldBridgeState } from '#~/page/messages.js'

export type ConnectionState = 'disabled' | 'idle' | 'connecting' | 'connected' | 'error'
export type InvocationCapabilityKind = 'tool' | 'prompt' | 'skill' | 'resource'
export type InvocationResultStatus = 'success' | 'error'

export interface InvocationRecord {
  requestId: string
  kind: InvocationCapabilityKind
  target: string
  status: InvocationResultStatus
  durationMs: number
  startedAt: string
  finishedAt: string
  errorMessage?: string
}

export interface InvocationKindStats {
  kind: InvocationCapabilityKind
  totalCount: number
  successCount: number
  errorCount: number
  totalDurationMs: number
  averageDurationMs: number
  minDurationMs?: number
  maxDurationMs?: number
}

export interface ClientInvocationStats {
  totalCount: number
  successCount: number
  errorCount: number
  totalDurationMs: number
  averageDurationMs: number
  minDurationMs?: number
  maxDurationMs?: number
  lastInvokedAt?: string
  lastStatus?: InvocationResultStatus
  lastDurationMs?: number
  lastTarget?: string
  lastErrorMessage?: string
  byKind: InvocationKindStats[]
  recentInvocations: InvocationRecord[]
}

export interface InvocationOverviewClientStats {
  clientKey: string
  clientName: string
  totalCount: number
  successCount: number
  errorCount: number
  totalDurationMs: number
  averageDurationMs: number
  maxDurationMs?: number
  lastInvokedAt?: string
}

export interface InvocationOverviewRecentRecord extends InvocationRecord {
  clientKey: string
  clientName: string
}

export interface InvocationOverviewStats {
  totalCount: number
  successCount: number
  errorCount: number
  totalDurationMs: number
  averageDurationMs: number
  maxDurationMs?: number
  lastInvokedAt?: string
  activeClientCount: number
  clients: InvocationOverviewClientStats[]
  recentInvocations: InvocationOverviewRecentRecord[]
}

export interface PopupClientState {
  clientKey: string
  kind: 'background' | 'route'
  id?: string
  clientId: string
  clientName: string
  clientDescription: string
  icon: ClientIconKey
  enabled: boolean
  connectionState: ConnectionState
  lastError?: string
  lastConnectedAt?: string
  matchPatterns: string[]
  routeRuleSummary?: string
  matchesActiveTab: boolean
  matchingTabCount: number
  recordingCount: number
  selectorResourceCount: number
  skillCount: number
  invocationStats: ClientInvocationStats
}

export interface PopupState {
  config: ExtensionConfig
  clients: PopupClientState[]
  onlineClientCount: number
  invocationOverview: InvocationOverviewStats
  marketUpdates?: {
    autoCheckEnabled: boolean
    lastCheckedAt?: string
    pendingUpdateCount: number
    pendingUpdates: MarketSourcePendingUpdate[]
  }
  activeRouteClientIds: string[]
  activeRouteClientNames: string[]
  activeRecording?: {
    routeClientId: string
    routeClientName: string
    startedAt: string
  }
  pendingSelectorCapture?: {
    routeClientId: string
    routeClientName: string
    resource: RouteSelectorResource
    capturedAt: string
  }
  activeTab?: {
    id?: number
    title?: string
    url?: string
    status?: string
    active: boolean
    eligible: boolean
  }
  activeOriginPattern?: string
  activeTabHasPermission?: boolean
  bridgeState?: MainWorldBridgeState
  injectedTools: InjectedToolDescriptor[]
}

export interface BrowserTabSummary {
  id?: number
  windowId?: number
  title?: string
  url?: string
  status?: string
  active: boolean
}

export interface TabInjectionState {
  url?: string
  contentScriptReady: boolean
  mainWorldReady: boolean
  appliedManagedScriptIds: string[]
}

export interface ManagedClientConnectionState {
  connectionState: ConnectionState
  lastError?: string
  lastConnectedAt?: string
}

export interface TargetTabSummary {
  id: number
  url?: string
  title?: string
  active: boolean
}

export function requireStringArg(args: unknown, key: string): string {
  const value = readString(asRecord(args), key)

  if (!value) {
    throw new Error(`${key} is required`)
  }

  return value
}

export function requireNumberArg(args: unknown, key: string): number {
  const value = readNumber(asRecord(args), key)

  if (value === undefined) {
    throw new Error(`${key} is required`)
  }

  return value
}

export function serializeTab(
  tab: Partial<Pick<chrome.tabs.Tab, 'id' | 'windowId' | 'title' | 'url' | 'status' | 'active'>>
): BrowserTabSummary {
  return {
    ...(typeof tab.id === 'number' ? { id: tab.id } : {}),
    ...(typeof tab.windowId === 'number' ? { windowId: tab.windowId } : {}),
    ...(typeof tab.title === 'string' ? { title: tab.title } : {}),
    ...(typeof tab.url === 'string' ? { url: tab.url } : {}),
    ...(typeof tab.status === 'string' ? { status: tab.status } : {}),
    active: Boolean(tab.active)
  }
}

export function toTargetTabSummary(
  tab: Partial<Pick<chrome.tabs.Tab, 'id' | 'title' | 'url' | 'active'>>
): TargetTabSummary {
  if (typeof tab.id !== 'number') {
    throw new Error('Target tab is missing an id')
  }

  return {
    id: tab.id,
    ...(typeof tab.url === 'string' ? { url: tab.url } : {}),
    ...(typeof tab.title === 'string' ? { title: tab.title } : {}),
    active: Boolean(tab.active)
  }
}

export function tabTargetSchema() {
  return {
    type: 'object',
    properties: {
      tabId: { type: 'number' }
    }
  }
}

export function jsonResource(value: unknown) {
  return {
    mimeType: 'application/json',
    text: JSON.stringify(value, null, 2)
  }
}

export function createNotificationIcon(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="24" fill="#2563eb" />
      <path d="M24 34h18l22 29 22-29h18v60H86V61L64 90 42 61v33H24z" fill="#f8fafc" />
    </svg>
  `.trim()

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function createManagedScriptId(prefix: string, source: string): string {
  return createStableId(prefix, source)
}

export function createClientKey(kind: 'background' | 'route', id = 'default'): string {
  return `${kind}:${id}`
}

export function isScrollLogicalPosition(
  value: string | undefined
): value is 'start' | 'center' | 'end' | 'nearest' {
  return value === 'start' || value === 'center' || value === 'end' || value === 'nearest'
}

export function summarizeRouteClientAssets(client: RouteClientConfig) {
  return {
    recordingCount: client.recordings.length,
    selectorResourceCount: client.selectorResources.length,
    skillCount: client.skillEntries.length
  }
}

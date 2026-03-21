import type { InjectedToolDescriptor, MainWorldBridgeState } from '../page/messages.js'
import type { ExtensionConfig } from '../shared/config.js'
import { asRecord, createStableId, readNumber, readString } from '../shared/utils.js'

export type ConnectionState = 'disabled' | 'idle' | 'connecting' | 'connected' | 'error'

export interface PopupState {
  connectionState: ConnectionState
  lastError?: string
  lastConnectedAt?: string
  config: ExtensionConfig
  grantedOrigins: string[]
  missingMatchPatterns: string[]
  activeTab?: {
    id?: number
    title?: string
    url?: string
    status?: string
    active: boolean
    eligible: boolean
  }
  activeOriginPattern?: string
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
      <rect width="128" height="128" rx="24" fill="#0f766e" />
      <path d="M26 32h18l20 32 20-32h18v64H84V61L64 92 44 61v35H26z" fill="#f8fafc" />
    </svg>
  `.trim()

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function createManagedScriptId(prefix: string, source: string): string {
  return createStableId(prefix, source)
}

export function isScrollLogicalPosition(
  value: string | undefined
): value is 'start' | 'center' | 'end' | 'nearest' {
  return value === 'start' || value === 'center' || value === 'end' || value === 'nearest'
}

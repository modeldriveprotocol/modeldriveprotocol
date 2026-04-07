import type { MdpClient } from '@modeldriveprotocol/client/browser'

import type { RouteSelectorResource } from '#~/shared/config.js'

export const CONTENT_SCRIPT_ID = 'mdp-chrome-extension-content'
export const RECONNECT_DELAY_MS = 5_000

export interface ManagedClientHandle {
  key: string
  kind: 'background' | 'route'
  clientId: string
  backgroundClientId?: string
  routeClientId?: string
  client: MdpClient
}

export interface ActiveRecordingSession {
  routeClientId: string
  routeClientName: string
  tabId: number
  startedAt: string
}

export interface SelectorCaptureSession {
  routeClientId: string
  routeClientName: string
  tabId: number
}

export interface PendingSelectorCapture {
  routeClientId: string
  routeClientName: string
  resource: RouteSelectorResource
  capturedAt: string
}

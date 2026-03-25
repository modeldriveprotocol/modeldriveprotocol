import {
  type ClientTransport,
  HttpLoopClientTransport,
  WebSocketClientTransport
} from '@modeldriveprotocol/client'

import type {
  PageRecordedAction,
  PageRecordingResult,
  PageSelectorCaptureResult
} from '#~/page/messages.js'
import type {
  RouteClientConfig,
  RouteClientRecording,
  RouteSelectorResource
} from '#~/shared/config.js'
import { matchesRouteClient } from '#~/shared/config.js'
import { createRequestId } from '#~/shared/utils.js'
import type { BrowserTabSummary } from '#~/background/shared.js'

export function createTransport(serverUrl: string): ClientTransport {
  const protocol = new URL(serverUrl).protocol

  switch (protocol) {
    case 'ws:':
    case 'wss:':
      return new WebSocketClientTransport(serverUrl)
    case 'http:':
    case 'https:':
      return new HttpLoopClientTransport(serverUrl)
    default:
      throw new Error(`Unsupported MDP server protocol: ${protocol}`)
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}

export function createRecordingFromCapture(
  routeClient: RouteClientConfig,
  result: PageRecordingResult,
  options: {
    name?: string
    description?: string
  }
): RouteClientRecording {
  const stepPreview = result.steps
    .map((step) => step.type)
    .slice(0, 3)
    .join(' -> ')
  const name = options.name?.trim() || `${routeClient.clientName} Flow ${routeClient.recordings.length + 1}`

  return {
    id: createRequestId('recording'),
    path: createUniqueAssetPath(
      routeClient.recordings.map((recording) => recording.path),
      name,
      'flow'
    ),
    name,
    description: options.description?.trim() || stepPreview || 'Recorded interaction flow.',
    mode: 'recording',
    createdAt: result.finishedAt,
    updatedAt: result.finishedAt,
    startUrl: result.url,
    capturedFeatures: result.capturedFeatures,
    steps: result.steps.map((step) => normalizeRecordedAction(step)),
    scriptSource: ''
  }
}

export function normalizeRecordedAction(action: PageRecordedAction) {
  return {
    id: action.id,
    type: action.type,
    selector: action.selector,
    alternativeSelectors: action.alternativeSelectors,
    tagName: action.tagName,
    classes: action.classes,
    timestampOffsetMs: action.timestampOffsetMs,
    ...(action.text ? { text: action.text } : {}),
    ...(action.label ? { label: action.label } : {}),
    ...(action.inputType ? { inputType: action.inputType } : {}),
    ...(action.value !== undefined ? { value: action.value } : {}),
    ...(action.key ? { key: action.key } : {}),
    ...(action.code ? { code: action.code } : {})
  }
}

export function createSelectorResource(
  routeClient: RouteClientConfig,
  result: PageSelectorCaptureResult
): RouteSelectorResource {
  const name = `${routeClient.clientName} Selector ${routeClient.selectorResources.length + 1}`

  return {
    id: createRequestId('selector-resource'),
    path: createUniqueAssetPath(
      routeClient.selectorResources.map((resource) => resource.path),
      name,
      'resource'
    ),
    name,
    description: `Captured selector resource for ${result.tagName}.`,
    createdAt: new Date().toISOString(),
    url: result.url,
    selector: result.selector,
    alternativeSelectors: result.alternativeSelectors,
    tagName: result.tagName,
    classes: result.classes,
    ...(result.text ? { text: result.text } : {}),
    attributes: result.attributes
  }
}

export function countMatchingTabsForRouteClient(
  routeClient: RouteClientConfig,
  tabs: Array<Pick<BrowserTabSummary, 'url'>>
): number {
  return tabs.reduce((count, tab) => (
    matchesRouteClient(tab.url, routeClient) ? count + 1 : count
  ), 0)
}

function createUniqueAssetPath(
  existingPaths: string[],
  fallbackName: string,
  defaultBase: string
): string {
  const basePath = normalizeEditableAssetPath(fallbackName) || defaultBase
  const usedPaths = new Set(
    existingPaths.map((path) => normalizeEditableAssetPath(path)).filter(Boolean)
  )
  let candidate = basePath
  let attempt = 2

  while (usedPaths.has(candidate)) {
    candidate = `${basePath}-${attempt}`
    attempt += 1
  }

  return candidate
}

function normalizeEditableAssetPath(path: string): string {
  return path
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
    )
    .filter(Boolean)
    .join('/')
}

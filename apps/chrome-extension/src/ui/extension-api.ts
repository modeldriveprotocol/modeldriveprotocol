import type { PopupState } from '#~/background/shared.js'
import {
  type ExtensionConfig,
  type RouteClientConfig,
  createRouteClientConfig,
  createRouteClientFromUrl,
  createRouteRule,
  normalizeConfig
} from '#~/shared/config.js'
import { loadConfig, saveConfig } from '#~/shared/storage.js'

interface RuntimeMessageResponse {
  ok: boolean
  data?: unknown
  error?: {
    message?: string
  }
}

export type OptionsSection = 'workspace' | 'settings' | 'clients' | 'assets' | 'market'
export type OptionsAssetsTab = 'flows' | 'resources' | 'skills'

function buildOptionsHashPath(
  section: OptionsSection,
  options?: {
    clientId?: string
    assetTab?: OptionsAssetsTab
  }
): string {
  const targetSection = section === 'assets' ? 'clients' : section

  if (targetSection === 'clients' && options?.clientId) {
    const segments = ['clients', encodeURIComponent(options.clientId)]

    if (options.assetTab) {
      segments.push('assets', options.assetTab)
    }

    return `#/${segments.join('/')}`
  }

  return `#/${targetSection}`
}

export async function sendRuntimeMessage<T>(message: Record<string, unknown>): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as RuntimeMessageResponse

  if (!response.ok) {
    throw new Error(response.error?.message ?? 'Runtime message failed')
  }

  return response.data as T
}

export function openOptionsSection(
  section: OptionsSection,
  options?: {
    clientId?: string
    assetTab?: OptionsAssetsTab
  }
): Promise<chrome.tabs.Tab | undefined> {
  return chrome.tabs.create({
    url: chrome.runtime.getURL(`options.html${buildOptionsHashPath(section, options)}`)
  })
}

export async function openSidePanel(): Promise<void> {
  if (!chrome.sidePanel?.open) {
    throw new Error('The current extension instance does not expose the Chrome sidePanel API.')
  }

  const currentWindow = await chrome.windows.getCurrent()
  const [activeTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  })

  if (activeTab?.id !== undefined && chrome.sidePanel.setOptions) {
    await chrome.sidePanel.setOptions({
      tabId: activeTab.id,
      enabled: true,
      path: 'sidepanel.html'
    })
  }

  if (currentWindow.id === undefined) {
    throw new Error('Unable to resolve the current window for the side panel.')
  }

  await chrome.sidePanel.open({
    windowId: currentWindow.id,
    ...(activeTab?.id !== undefined ? { tabId: activeTab.id } : {})
  })
}

export async function getPopupState(): Promise<PopupState> {
  return sendRuntimeMessage<PopupState>({
    type: 'popup:getState'
  })
}

export async function getRuntimeStatus(): Promise<PopupState> {
  return sendRuntimeMessage<PopupState>({
    type: 'runtime:getStatus'
  })
}

export async function refreshRuntime(): Promise<void> {
  await sendRuntimeMessage<null>({
    type: 'runtime:refresh'
  })
}

export async function requestRouteClientFromActiveTab(): Promise<{ clientName: string }> {
  return sendRuntimeMessage<{ clientName: string }>({
    type: 'popup:createRouteClientFromActiveTab'
  })
}

export async function grantOrigin(routeClientId: string | undefined, originPattern: string | undefined): Promise<void> {
  if (!routeClientId) {
    throw new Error('A route client must be selected before requesting host access.')
  }

  if (!originPattern) {
    throw new Error('The current page does not expose a grantable host origin.')
  }

  const granted = await chrome.permissions.request({
    origins: [originPattern]
  })

  if (!granted) {
    throw new Error(`Host permission request was denied for ${originPattern}`)
  }

  await sendRuntimeMessage<null>({
    type: 'popup:grantActiveTabOrigin',
    routeClientId,
    pattern: originPattern
  })
}

export async function injectBridge(routeClientId: string | undefined): Promise<void> {
  await sendRuntimeMessage<null>({
    type: 'popup:injectActiveTab',
    routeClientId
  })
}

export async function startRecording(routeClientId: string | undefined): Promise<void> {
  await sendRuntimeMessage<null>({
    type: 'popup:startRecording',
    routeClientId
  })
}

export async function stopRecording(name: string, description: string): Promise<{ stepCount: number }> {
  return sendRuntimeMessage<{ stepCount: number }>({
    type: 'popup:stopRecording',
    name,
    description
  })
}

export async function startSelectorCapture(routeClientId: string | undefined): Promise<void> {
  await sendRuntimeMessage<null>({
    type: 'popup:startSelectorCapture',
    routeClientId
  })
}

export async function clearPendingSelectorCapture(): Promise<void> {
  await sendRuntimeMessage<null>({
    type: 'popup:clearPendingSelectorCapture'
  })
}

export async function runRecording(routeClientId: string, recordingId: string): Promise<void> {
  await sendRuntimeMessage<null>({
    type: 'popup:runRecording',
    routeClientId,
    recordingId
  })
}

export async function loadWorkspaceConfig(): Promise<ExtensionConfig> {
  return loadConfig()
}

export async function saveWorkspaceConfig(config: ExtensionConfig): Promise<ExtensionConfig> {
  return saveConfig(normalizeConfig(config))
}

export function createEmptyRouteClient(position: number): RouteClientConfig {
  return createRouteClientConfig({
    clientName: `Route Client ${position}`,
    clientId: `mdp-route-client-${position}`,
    icon: position % 2 === 0 ? 'layers' : 'route'
  })
}

export function createPresetRouteClient(url: string): RouteClientConfig {
  return createRouteClientFromUrl(url)
}

export function appendRouteRule(client: RouteClientConfig): RouteClientConfig {
  return {
    ...client,
    routeRules: [...client.routeRules, createRouteRule()]
  }
}

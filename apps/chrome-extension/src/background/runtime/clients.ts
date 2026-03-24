import { createMdpClient } from '@modeldriveprotocol/client'

import {
  type ExtensionConfig,
  type RouteClientConfig,
  matchesRouteClient,
  normalizeConfig
} from '#~/shared/config.js'
import { loadConfig, saveConfig } from '#~/shared/storage.js'
import { serializeError } from '#~/shared/utils.js'
import { registerBackgroundCapabilities } from '#~/background/capabilities/index.js'
import { registerRouteClientCapabilities } from '#~/background/capabilities/route.js'
import {
  createClientKey,
  summarizeRouteClientAssets
} from '#~/background/shared.js'

import type { ChromeExtensionRuntime } from './index.js'
import { createTransport } from './helpers.js'
import { RECONNECT_DELAY_MS } from './types.js'

export async function refreshRuntime(runtime: ChromeExtensionRuntime): Promise<void> {
  const config = normalizeConfig(await loadConfig())
  const permissionState = await runtime.syncContentScriptRegistration(config)
  runtime.currentConfig = config
  await runtime.bootstrapOpenTabs(config, permissionState.granted)
  await syncClients(runtime, config)
}

export async function syncClients(runtime: ChromeExtensionRuntime, config: ExtensionConfig): Promise<void> {
  await disconnectAllClients(runtime)
  const pending: Array<Promise<void>> = []

  if (config.backgroundClient.enabled) {
    pending.push(connectBackgroundClient(runtime, config))
  } else {
    runtime.clientStates.set(createClientKey('background'), { connectionState: 'disabled' })
  }

  for (const routeClient of config.routeClients) {
    if (!routeClient.enabled) {
      runtime.clientStates.set(createClientKey('route', routeClient.id), { connectionState: 'disabled' })
      continue
    }
    pending.push(connectRouteClient(runtime, config, routeClient))
  }

  await Promise.all(pending)
}

export async function connectBackgroundClient(runtime: ChromeExtensionRuntime, config: ExtensionConfig) {
  const key = createClientKey('background')
  runtime.clientStates.set(key, { connectionState: 'connecting' })

  try {
    const transport = createTransport(config.serverUrl)
    transport.onClose(() => {
      runtime.clientStates.set(key, { connectionState: 'idle' })
      runtime.scheduleReconnect()
    })

    const manifest = chrome.runtime.getManifest()
    const client = createMdpClient({
      serverUrl: config.serverUrl,
      transport,
      client: {
        id: config.backgroundClient.clientId,
        name: config.backgroundClient.clientName,
        description: config.backgroundClient.clientDescription,
        version: manifest.version,
        platform: 'chrome-extension',
        metadata: {
          manifestVersion: manifest.manifest_version,
          extensionId: chrome.runtime.id,
          clientKind: 'background'
        }
      }
    })

    registerBackgroundCapabilities(client, runtime)
    await client.connect()
    client.register()

    runtime.clients.set(key, { key, kind: 'background', clientId: config.backgroundClient.clientId, client })
    runtime.clientStates.set(key, { connectionState: 'connected', lastConnectedAt: new Date().toISOString() })
  } catch (error) {
    runtime.clientStates.set(key, { connectionState: 'error', lastError: serializeError(error).message })
    runtime.scheduleReconnect()
  }
}

export async function connectRouteClient(
  runtime: ChromeExtensionRuntime,
  config: ExtensionConfig,
  routeClient: RouteClientConfig
) {
  const key = createClientKey('route', routeClient.id)
  runtime.clientStates.set(key, { connectionState: 'connecting' })

  try {
    const transport = createTransport(config.serverUrl)
    transport.onClose(() => {
      runtime.clientStates.set(key, { connectionState: 'idle' })
      runtime.scheduleReconnect()
    })

    const manifest = chrome.runtime.getManifest()
    const assets = summarizeRouteClientAssets(routeClient)
    const client = createMdpClient({
      serverUrl: config.serverUrl,
      transport,
      client: {
        id: routeClient.clientId,
        name: routeClient.clientName,
        description: routeClient.clientDescription,
        version: manifest.version,
        platform: 'chrome-extension',
        metadata: {
          manifestVersion: manifest.manifest_version,
          extensionId: chrome.runtime.id,
          clientKind: 'route',
          routeClientId: routeClient.id,
          matchPatternCount: routeClient.matchPatterns.length,
          routeRuleCount: routeClient.routeRules.length,
          recordingCount: assets.recordingCount,
          selectorResourceCount: assets.selectorResourceCount,
          skillCount: assets.skillCount
        }
      }
    })

    registerRouteClientCapabilities(client, runtime, routeClient)
    await client.connect()
    client.register()

    runtime.clients.set(key, {
      key,
      kind: 'route',
      clientId: routeClient.clientId,
      routeClientId: routeClient.id,
      client
    })
    runtime.clientStates.set(key, { connectionState: 'connected', lastConnectedAt: new Date().toISOString() })
  } catch (error) {
    runtime.clientStates.set(key, { connectionState: 'error', lastError: serializeError(error).message })
    runtime.scheduleReconnect()
  }
}

export async function disconnectAllClients(runtime: ChromeExtensionRuntime) {
  if (runtime.reconnectTimer !== undefined) {
    globalThis.clearTimeout(runtime.reconnectTimer)
    runtime.reconnectTimer = undefined
  }

  const handles = [...runtime.clients.values()]
  runtime.clients.clear()

  await Promise.all(
    handles.map(async (handle) => {
      try {
        await handle.client.disconnect()
      } catch {
        // Best effort shutdown.
      }
    })
  )
}

export async function getRouteClient(runtime: ChromeExtensionRuntime, routeClientId: string) {
  const config = await runtime.getConfig()
  const routeClient = config.routeClients.find((client) => client.id === routeClientId)
  if (!routeClient) {
    throw new Error(`Unknown route client "${routeClientId}"`)
  }
  return routeClient
}

export async function resolvePopupRouteClient(runtime: ChromeExtensionRuntime, routeClientId?: string) {
  const config = await runtime.getConfig()
  if (routeClientId) {
    return runtime.getRouteClient(routeClientId)
  }

  const activeTab = await runtime.getActiveTab()
  const activeMatch = config.routeClients.find((client) => matchesRouteClient(activeTab?.url, client))
  if (activeMatch) {
    return activeMatch
  }

  const firstEnabled = config.routeClients.find((client) => client.enabled)
  if (firstEnabled) {
    return firstEnabled
  }

  throw new Error('No enabled route client is available')
}

export async function updateRouteClient(
  runtime: ChromeExtensionRuntime,
  routeClientId: string,
  updater: (client: RouteClientConfig) => RouteClientConfig
) {
  const config = await runtime.getConfig()
  const nextConfig = {
    ...config,
    routeClients: config.routeClients.map((client) => (client.id === routeClientId ? updater(client) : client))
  }
  runtime.currentConfig = await saveConfig(nextConfig)
}

export function scheduleReconnect(runtime: ChromeExtensionRuntime): void {
  if (runtime.reconnectTimer !== undefined) {
    return
  }
  const config = runtime.currentConfig
  if (!config || (!config.backgroundClient.enabled && !config.routeClients.some((client) => client.enabled))) {
    return
  }
  runtime.reconnectTimer = globalThis.setTimeout(() => {
    runtime.reconnectTimer = undefined
    void runtime.refresh()
  }, RECONNECT_DELAY_MS)
}

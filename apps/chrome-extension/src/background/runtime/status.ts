import {
  getOriginMatchPattern,
  listWorkspaceMatchPatterns,
  matchesAnyPattern,
  matchesRouteClient,
  summarizeRouteRules
} from '#~/shared/config.js'
import { loadMarketSourceSyncState } from '#~/shared/storage.js'
import {
  createClientKey,
  summarizeRouteClientAssets
} from '#~/background/shared.js'

import type { ChromeExtensionRuntime } from '../runtime.js'
import { buildInvocationOverview, toClientInvocationStats } from './telemetry.js'

export async function getRuntimeStatus(runtime: ChromeExtensionRuntime) {
  const config = await runtime.getConfig()
  const marketSyncState = await loadMarketSourceSyncState()
  const grantedPatterns = listWorkspaceMatchPatterns(config)
  const permissionState = await runtime.getPermissionState(grantedPatterns)
  const activeTab = await runtime.getActiveTab()
  const activeOriginPattern =
    typeof activeTab?.url === 'string' ? getOriginMatchPattern(activeTab.url) : undefined
  const activeTabHasPermission =
    typeof activeTab?.url === 'string'
      ? matchesAnyPattern(activeTab.url, permissionState.granted)
      : false
  const activeRouteClients = config.routeClients.filter((client) =>
    matchesRouteClient(activeTab?.url, client)
  )
  const bridgeState =
    typeof activeTab?.id === 'number' &&
    typeof activeTab.url === 'string' &&
    activeTabHasPermission
      ? await runtime.safeGetMainWorldState(activeTab.id)
      : undefined

  const clients = [
    ...config.backgroundClients.map((client) => {
      const key = createClientKey('background', client.id)
      const state = runtime.clientStates.get(key)

      return {
        clientKey: key,
        kind: 'background' as const,
        id: client.id,
        clientId: client.clientId,
        clientName: client.clientName,
        clientDescription: client.clientDescription,
        icon: client.icon,
        enabled: client.enabled,
        connectionState: state?.connectionState ?? (client.enabled ? 'idle' : 'disabled'),
        lastError: state?.lastError,
        lastConnectedAt: state?.lastConnectedAt,
        matchPatterns: [],
        matchesActiveTab: false,
        recordingCount: 0,
        selectorResourceCount: 0,
        skillCount: 0,
        invocationStats: toClientInvocationStats(runtime.clientTelemetry.get(key))
      }
    }),
    ...config.routeClients.map((client) => {
      const key = createClientKey('route', client.id)
      const state = runtime.clientStates.get(key)
      const assets = summarizeRouteClientAssets(client)

      return {
        clientKey: key,
        kind: 'route' as const,
        id: client.id,
        clientId: client.clientId,
        clientName: client.clientName,
        clientDescription: client.clientDescription,
        icon: client.icon,
        enabled: client.enabled,
        connectionState: state?.connectionState ?? (client.enabled ? 'idle' : 'disabled'),
        lastError: state?.lastError,
        lastConnectedAt: state?.lastConnectedAt,
        matchPatterns: client.matchPatterns,
        routeRuleSummary: summarizeRouteRules(client),
        matchesActiveTab: matchesRouteClient(activeTab?.url, client),
        recordingCount: assets.recordingCount,
        selectorResourceCount: assets.selectorResourceCount,
        skillCount: assets.skillCount,
        invocationStats: toClientInvocationStats(runtime.clientTelemetry.get(key))
      }
    })
  ]

  return {
    config,
    clients,
    onlineClientCount: [...runtime.clientStates.values()].filter(
      (state) => state.connectionState === 'connected'
    ).length,
    invocationOverview: buildInvocationOverview(
      clients.map((client) => ({
        clientKey: client.clientKey,
        clientName: client.clientName,
        invocationStats: client.invocationStats
      }))
    ),
    marketUpdates: {
      autoCheckEnabled: config.marketAutoCheckUpdates,
      ...(marketSyncState.lastCheckedAt ? { lastCheckedAt: marketSyncState.lastCheckedAt } : {}),
      pendingUpdateCount: marketSyncState.pendingUpdates.length,
      pendingUpdates: marketSyncState.pendingUpdates
    },
    activeRouteClientIds: activeRouteClients.map((client) => client.id),
    activeRouteClientNames: activeRouteClients.map((client) => client.clientName),
    ...(runtime.activeRecording ? { activeRecording: runtime.activeRecording } : {}),
    ...(runtime.pendingSelectorCapture ? { pendingSelectorCapture: runtime.pendingSelectorCapture } : {}),
    ...(activeOriginPattern ? { activeOriginPattern } : {}),
    ...(activeTabHasPermission ? { activeTabHasPermission: true } : {}),
    ...(bridgeState ? { bridgeState } : {}),
    ...(activeTab && typeof activeTab.id === 'number'
      ? {
          activeTab: {
            id: activeTab.id,
            ...(typeof activeTab.title === 'string' ? { title: activeTab.title } : {}),
            ...(typeof activeTab.url === 'string' ? { url: activeTab.url } : {}),
            ...(typeof activeTab.status === 'string' ? { status: activeTab.status } : {}),
            active: Boolean(activeTab.active),
            eligible: activeRouteClients.length > 0
          }
        }
      : {}),
    injectedTools: bridgeState?.tools ?? []
  }
}

import {
  type ExtensionConfig,
  type RouteClientConfig,
  listWorkspaceMatchPatterns,
  matchesAnyPattern,
  matchesRouteClient
} from '#~/shared/config.js'
import { asRecord, readNumber } from '#~/shared/utils.js'
import { toTargetTabSummary } from '#~/background/shared.js'

import type { ChromeExtensionRuntime } from '../runtime.js'
import { CONTENT_SCRIPT_ID } from './types.js'

export async function resolveAllowedPageTabForRouteClient(
  runtime: ChromeExtensionRuntime,
  routeClient: RouteClientConfig,
  args: unknown
) {
  const explicitTabId = readNumber(asRecord(args), 'tabId')
  if (explicitTabId !== undefined) {
    const explicitTab = await chrome.tabs.get(explicitTabId)
    const summary = toTargetTabSummary(explicitTab)
    await ensureAllowedRouteTab(runtime, summary, routeClient)
    return summary
  }

  const activeTab = await runtime.getActiveTab()
  if (activeTab?.id !== undefined && matchesRouteClient(activeTab.url, routeClient)) {
    await ensureAllowedRouteTab(runtime, toTargetTabSummary(activeTab), routeClient)
    return toTargetTabSummary(activeTab)
  }

  const tabs = await chrome.tabs.query({})
  const fallback = tabs.find((tab) => matchesRouteClient(tab.url, routeClient))
  if (!fallback) {
    throw new Error(`No open tab currently matches route client "${routeClient.clientName}"`)
  }

  const summary = toTargetTabSummary(fallback)
  await ensureAllowedRouteTab(runtime, summary, routeClient)
  return summary
}

export async function requireMatchingActiveTab(
  runtime: ChromeExtensionRuntime,
  routeClient: RouteClientConfig
) {
  const activeTab = await runtime.getActiveTab()
  if (!activeTab?.id) {
    throw new Error('No active tab is available')
  }
  const summary = toTargetTabSummary(activeTab)
  await ensureAllowedRouteTab(runtime, summary, routeClient)
  return summary
}

export async function ensureAllowedRouteTab(
  runtime: ChromeExtensionRuntime,
  tab: { id: number; url?: string },
  routeClient: RouteClientConfig
): Promise<void> {
  if (!tab.url) {
    throw new Error('Target tab does not expose a URL')
  }
  if (!matchesRouteClient(tab.url, routeClient)) {
    throw new Error(`Target tab URL does not match route client "${routeClient.clientName}" patterns and rules`)
  }
  const permissionState = await runtime.getPermissionState(routeClient.matchPatterns)
  if (!matchesAnyPattern(tab.url, permissionState.granted)) {
    throw new Error(`Target tab URL is not covered by granted host permissions for route client "${routeClient.clientName}"`)
  }
}

export async function getPermissionState(patterns: string[]) {
  const granted: string[] = []
  const missing: string[] = []

  for (const pattern of patterns) {
    const contains = (await chrome.permissions.contains({ origins: [pattern] })) as boolean
    if (contains) {
      granted.push(pattern)
    } else {
      missing.push(pattern)
    }
  }

  return { granted, missing }
}

export async function syncContentScriptRegistration(
  runtime: ChromeExtensionRuntime,
  config: ExtensionConfig
) {
  const matchPatterns = listWorkspaceMatchPatterns(config)
  const permissionState = await runtime.getPermissionState(matchPatterns)

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] })
  } catch {
    // Ignore missing registrations.
  }

  if (permissionState.granted.length > 0) {
    await chrome.scripting.registerContentScripts([
      {
        id: CONTENT_SCRIPT_ID,
        matches: permissionState.granted,
        js: ['content-script.js'],
        runAt: 'document_idle',
        persistAcrossSessions: true
      }
    ])
  }

  return permissionState
}

export async function bootstrapOpenTabs(
  runtime: ChromeExtensionRuntime,
  config: ExtensionConfig,
  grantedPatterns: string[]
) {
  if (grantedPatterns.length === 0) {
    return
  }

  const tabs = await chrome.tabs.query({})
  await Promise.all(
    tabs.map(async (tab) => {
      if (typeof tab.id !== 'number' || typeof tab.url !== 'string') {
        return
      }
      const tabId = tab.id
      const tabUrl = tab.url
      await Promise.all(
        config.routeClients.map(async (client) => {
          if (matchesRouteClient(tabUrl, client) && matchesAnyPattern(tabUrl, grantedPatterns)) {
            try {
              await runtime.ensureScriptsInjected(tabId, client, client.autoInjectBridge)
            } catch {
              // Ignore tabs that cannot be scripted.
            }
          }
        })
      )
    })
  )
}

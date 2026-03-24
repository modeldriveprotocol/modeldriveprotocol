import {
  listWorkspaceMatchPatterns,
  matchesAnyPattern,
  matchesRouteClient
} from '#~/shared/config.js'

import type { ChromeExtensionRuntime } from '../runtime.js'

export async function handleTabUpdated(
  runtime: ChromeExtensionRuntime,
  tabId: number,
  url: string | undefined
) {
  const config = await runtime.getConfig()
  const grantedPatterns = listWorkspaceMatchPatterns(config)
  const permissionState = await runtime.getPermissionState(grantedPatterns)
  const existingState = runtime.tabInjectionState.get(tabId)

  if (existingState && existingState.url !== url) {
    runtime.tabInjectionState.delete(tabId)
  }

  if (!url) {
    return
  }

  await Promise.all(
    config.routeClients.map(async (client) => {
      if (matchesRouteClient(url, client) && matchesAnyPattern(url, permissionState.granted)) {
        await runtime.ensureScriptsInjected(tabId, client, client.autoInjectBridge)
      }
    })
  )
}

export function handleTabRemoved(runtime: ChromeExtensionRuntime, tabId: number) {
  runtime.tabInjectionState.delete(tabId)

  if (runtime.activeRecording?.tabId === tabId) {
    runtime.activeRecording = undefined
  }

  if (runtime.selectorCaptureSession?.tabId === tabId) {
    runtime.selectorCaptureSession = undefined
  }
}

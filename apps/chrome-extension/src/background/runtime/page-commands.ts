import type {
  InjectedToolDescriptor,
  MainWorldBridgeState,
  PageCommand,
  PageCommandEnvelope,
  PageCommandResponse
} from '#~/page/messages.js'
import { PAGE_COMMAND_CHANNEL } from '#~/page/messages.js'
import type { RouteClientConfig } from '#~/shared/config.js'
import { createManagedScriptId } from '#~/background/shared.js'

import type { ChromeExtensionRuntime } from './index.js'

export async function ensureScriptsInjected(
  runtime: ChromeExtensionRuntime,
  tabId: number,
  routeClient: RouteClientConfig,
  injectBridge: boolean
) {
  const tab = await chrome.tabs.get(tabId)
  const currentUrl = typeof tab.url === 'string' ? tab.url : undefined
  const currentState = runtime.tabInjectionState.get(tabId)
  const state =
    !currentState || currentState.url !== currentUrl
      ? { ...(currentUrl ? { url: currentUrl } : {}), contentScriptReady: false, mainWorldReady: false, appliedManagedScriptIds: [] }
      : currentState

  if (!state.contentScriptReady) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js']
    })
    state.contentScriptReady = true
  }

  if (!injectBridge) {
    runtime.tabInjectionState.set(tabId, state)
    return
  }

  if (!state.mainWorldReady) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['injected-main.js'],
      world: 'MAIN'
    })
    state.mainWorldReady = true
  }

  if (routeClient.toolScriptSource.trim()) {
    const managedScriptId = createManagedScriptId(`route-tool-script-${routeClient.id}`, routeClient.toolScriptSource)
    if (!state.appliedManagedScriptIds.includes(managedScriptId)) {
      await dispatchPageCommand(tabId, {
        type: 'runMainWorld',
        action: 'runScript',
        args: { source: routeClient.toolScriptSource, scriptId: managedScriptId }
      })
      state.appliedManagedScriptIds.push(managedScriptId)
    }
  }

  runtime.tabInjectionState.set(tabId, state)
}

export async function dispatchPageCommand<TResult>(tabId: number, command: PageCommand): Promise<TResult> {
  const response = (await chrome.tabs.sendMessage(tabId, {
    channel: PAGE_COMMAND_CHANNEL,
    command
  } satisfies PageCommandEnvelope)) as PageCommandResponse<TResult>

  if (!response?.ok) {
    throw new Error(response?.error?.message ?? 'Page command failed')
  }

  return response.data as TResult
}

export async function sendPageCommand<TResult>(
  runtime: ChromeExtensionRuntime,
  tabId: number,
  routeClient: RouteClientConfig,
  command: PageCommand
) {
  const injectBridge = command.type === 'runMainWorld' || routeClient.autoInjectBridge
  await runtime.ensureScriptsInjected(tabId, routeClient, injectBridge)

  try {
    return await dispatchPageCommand<TResult>(tabId, command)
  } catch {
    runtime.tabInjectionState.delete(tabId)
    await runtime.ensureScriptsInjected(tabId, routeClient, injectBridge)
    return dispatchPageCommand<TResult>(tabId, command)
  }
}

export async function listInjectedTools(
  runtime: ChromeExtensionRuntime,
  tabId: number,
  routeClient: RouteClientConfig
): Promise<InjectedToolDescriptor[]> {
  return runtime.sendPageCommand(tabId, routeClient, {
    type: 'runMainWorld',
    action: 'listTools'
  })
}

export async function getMainWorldState(
  runtime: ChromeExtensionRuntime,
  tabId: number,
  routeClient: RouteClientConfig
): Promise<MainWorldBridgeState> {
  return runtime.sendPageCommand(tabId, routeClient, {
    type: 'runMainWorld',
    action: 'getState'
  })
}

export async function safeGetMainWorldState(runtime: ChromeExtensionRuntime, tabId: number) {
  const activeMatches = (await runtime.getConfig()).routeClients.filter((client) => client.enabled)
  const activeRoute = activeMatches.at(0)
  if (!activeRoute) {
    return undefined
  }
  try {
    return await runtime.getMainWorldState(tabId, activeRoute)
  } catch {
    return undefined
  }
}

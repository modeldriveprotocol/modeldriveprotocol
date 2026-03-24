import type {
  InjectedToolDescriptor,
  MainWorldBridgeState,
  PageCommand,
  PageRecordingResult,
  PageSelectorCaptureResult
} from '#~/page/messages.js'
import {
  type RouteClientConfig,
  createRouteClientFromUrl,
  getOriginMatchPattern,
  summarizeRouteRules
} from '#~/shared/config.js'
import { saveConfig } from '#~/shared/storage.js'
import { asRecord, readNumber, readString } from '#~/shared/utils.js'
import { createManagedScriptId } from '#~/background/shared.js'

import type { ChromeExtensionRuntime } from '../runtime.js'
import { createRecordingFromCapture, createSelectorResource, delay } from './helpers.js'

export async function runPageCommandForRouteClient<TResult>(
  runtime: ChromeExtensionRuntime,
  routeClientId: string,
  args: unknown,
  command: PageCommand
) {
  const routeClient = await runtime.getRouteClient(routeClientId)
  const tab = await runtime.resolveAllowedPageTabForRouteClient(routeClient, args)
  return runtime.sendPageCommand<TResult>(tab.id, routeClient, command)
}

export async function injectToolScriptForRouteClient(
  runtime: ChromeExtensionRuntime,
  routeClientId: string,
  input: { tabId?: number; source: string; scriptArgs?: unknown; scriptId?: string; force?: boolean }
): Promise<InjectedToolDescriptor[]> {
  const routeClient = await runtime.getRouteClient(routeClientId)
  const tab = await runtime.resolveAllowedPageTabForRouteClient(routeClient, input)
  const scriptId = input.scriptId ?? createManagedScriptId(`page-tool-${routeClient.id}`, input.source)

  await runtime.ensureScriptsInjected(tab.id, routeClient, true)
  await runtime.dispatchPageCommand(tab.id, {
    type: 'runMainWorld',
    action: 'runScript',
    args: {
      source: input.source,
      scriptId,
      ...(input.scriptArgs !== undefined ? { scriptArgs: input.scriptArgs } : {}),
      ...(input.force !== undefined ? { force: input.force } : {})
    }
  })

  return runtime.listInjectedTools(tab.id, routeClient)
}

export async function getInjectedStateForRouteClient(
  runtime: ChromeExtensionRuntime,
  routeClientId: string,
  args: unknown
): Promise<MainWorldBridgeState> {
  const routeClient = await runtime.getRouteClient(routeClientId)
  const tab = await runtime.resolveAllowedPageTabForRouteClient(routeClient, args)
  return runtime.getMainWorldState(tab.id, routeClient)
}

export async function listInjectedToolsForRouteClient(
  runtime: ChromeExtensionRuntime,
  routeClientId: string,
  args: unknown
) {
  const routeClient = await runtime.getRouteClient(routeClientId)
  const tab = await runtime.resolveAllowedPageTabForRouteClient(routeClient, args)
  return runtime.listInjectedTools(tab.id, routeClient)
}

export async function callInjectedToolForRouteClient(
  runtime: ChromeExtensionRuntime,
  routeClientId: string,
  input: { tabId?: number; name: string; toolArgs?: unknown }
) {
  const routeClient = await runtime.getRouteClient(routeClientId)
  const tab = await runtime.resolveAllowedPageTabForRouteClient(routeClient, input)
  return runtime.sendPageCommand(tab.id, routeClient, {
    type: 'runMainWorld',
    action: 'invokeTool',
    args: { name: input.name, ...(input.toolArgs !== undefined ? { toolArgs: input.toolArgs } : {}) }
  })
}

export async function runRouteRecording(
  runtime: ChromeExtensionRuntime,
  routeClientId: string,
  recordingId: string,
  args: unknown
) {
  const routeClient = await runtime.getRouteClient(routeClientId)
  const recording = routeClient.recordings.find((item) => item.id === recordingId)
  if (!recording) {
    throw new Error(`Unknown recording "${recordingId}" for route client "${routeClientId}"`)
  }

  const tab = await runtime.resolveAllowedPageTabForRouteClient(routeClient, args)
  let previousOffset = 0
  for (const step of recording.steps) {
    const delayMs = Math.min(Math.max(0, step.timestampOffsetMs - previousOffset), 350)
    if (delayMs > 0) {
      await delay(delayMs)
    }
    switch (step.type) {
      case 'click':
        await runtime.sendPageCommand(tab.id, routeClient, { type: 'click', selector: step.selector })
        break
      case 'fill':
        await runtime.sendPageCommand(tab.id, routeClient, { type: 'fill', selector: step.selector, value: step.value ?? '' })
        break
      case 'pressKey':
        await runtime.sendPageCommand(tab.id, routeClient, {
          type: 'pressKey',
          key: step.key ?? 'Enter',
          ...(step.code ? { code: step.code } : {}),
          ...(step.selector ? { selector: step.selector } : {})
        })
        break
    }
    previousOffset = step.timestampOffsetMs
  }

  return { completed: true as const, routeClientId, recordingId, stepCount: recording.steps.length, tabId: tab.id }
}

export async function listRouteRecordings(runtime: ChromeExtensionRuntime, routeClientId: string) {
  return (await runtime.getRouteClient(routeClientId)).recordings
}

export async function listRouteSelectorResources(runtime: ChromeExtensionRuntime, routeClientId: string) {
  return (await runtime.getRouteClient(routeClientId)).selectorResources
}

export async function startRecording(runtime: ChromeExtensionRuntime, routeClientId: string) {
  const routeClient = await runtime.getRouteClient(routeClientId)
  const tab = await runtime.requireMatchingActiveTab(routeClient)
  await runtime.ensureScriptsInjected(tab.id, routeClient, true)
  await runtime.dispatchPageCommand(tab.id, { type: 'startRecording' })

  runtime.activeRecording = {
    routeClientId: routeClient.id,
    routeClientName: routeClient.clientName,
    tabId: tab.id,
    startedAt: new Date().toISOString()
  }

  return { started: true as const, routeClientId: routeClient.id, tabId: tab.id }
}

export async function stopRecording(
  runtime: ChromeExtensionRuntime,
  options: { name?: string; description?: string }
) {
  if (!runtime.activeRecording) {
    throw new Error('No recording is active')
  }

  const session = runtime.activeRecording
  const routeClient = await runtime.getRouteClient(session.routeClientId)
  const result = await runtime.dispatchPageCommand<PageRecordingResult>(session.tabId, { type: 'stopRecording' })
  const recording = createRecordingFromCapture(routeClient, result, options)
  runtime.activeRecording = undefined

  await runtime.updateRouteClient(routeClient.id, (client) => ({ ...client, recordings: [recording, ...client.recordings] }))
  await runtime.refresh()

  return { saved: true as const, routeClientId: routeClient.id, recordingId: recording.id, stepCount: recording.steps.length }
}

export async function startSelectorCapture(runtime: ChromeExtensionRuntime, routeClientId: string) {
  const routeClient = await runtime.getRouteClient(routeClientId)
  const tab = await runtime.requireMatchingActiveTab(routeClient)
  await runtime.ensureScriptsInjected(tab.id, routeClient, true)
  await runtime.dispatchPageCommand(tab.id, { type: 'startSelectorCapture' })

  runtime.selectorCaptureSession = {
    routeClientId: routeClient.id,
    routeClientName: routeClient.clientName,
    tabId: tab.id
  }

  return { started: true as const, routeClientId: routeClient.id, tabId: tab.id }
}

export async function handleSelectorCapturedMessage(
  runtime: ChromeExtensionRuntime,
  message: Record<string, unknown>,
  sender?: chrome.runtime.MessageSender
) {
  if (!runtime.selectorCaptureSession) {
    throw new Error('No selector capture session is active')
  }
  if (sender?.tab?.id !== runtime.selectorCaptureSession.tabId) {
    throw new Error('Selector capture came from an unexpected tab')
  }

  const routeClient = await runtime.getRouteClient(runtime.selectorCaptureSession.routeClientId)
  const result = message.data as PageSelectorCaptureResult
  const resource = createSelectorResource(routeClient, result)

  await runtime.updateRouteClient(routeClient.id, (client) => ({
    ...client,
    selectorResources: [resource, ...client.selectorResources]
  }))

  runtime.pendingSelectorCapture = {
    routeClientId: routeClient.id,
    routeClientName: routeClient.clientName,
    resource,
    capturedAt: new Date().toISOString()
  }
  runtime.selectorCaptureSession = undefined
  await runtime.refresh()

  return { captured: true as const, routeClientId: routeClient.id, resourceId: resource.id }
}

export async function persistGrantedActiveTabOrigin(
  runtime: ChromeExtensionRuntime,
  routeClientId: string,
  pattern: string
) {
  const routeClient = await runtime.getRouteClient(routeClientId)
  if (!pattern) {
    throw new Error('The active tab URL cannot be converted into a host permission pattern')
  }
  await runtime.updateRouteClient(routeClient.id, (client) => ({
    ...client,
    matchPatterns: [...new Set([...client.matchPatterns, pattern])]
  }))
  await runtime.refresh()
  return { granted: true as const, pattern, routeClientId: routeClient.id }
}

export async function createRouteClientFromActiveTab(
  runtime: ChromeExtensionRuntime,
  clientName?: string
) {
  const tab = await runtime.resolveTargetTab(undefined)
  if (!tab.url) {
    throw new Error('The active tab does not expose a URL')
  }
  if (!getOriginMatchPattern(tab.url)) {
    throw new Error('Open an http, https, or file page before creating a route client.')
  }

  const config = await runtime.getConfig()
  const nextClient = createRouteClientFromUrl(tab.url, {
    ...(clientName?.trim() ? { clientName } : {})
  })
  const duplicate = config.routeClients.find(
    (client) =>
      client.matchPatterns.join('\n') === nextClient.matchPatterns.join('\n') &&
      summarizeRouteRules(client) === summarizeRouteRules(nextClient)
  )

  if (duplicate) {
    throw new Error(`A similar route client already exists: ${duplicate.clientName}`)
  }

  runtime.currentConfig = await saveConfig({
    ...config,
    routeClients: [nextClient, ...config.routeClients]
  })
  await runtime.refresh()

  return {
    created: true as const,
    routeClientId: nextClient.id,
    clientName: nextClient.clientName,
    pattern: nextClient.matchPatterns[0] ?? ''
  }
}

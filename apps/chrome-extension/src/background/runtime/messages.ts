import type { UnknownRecord } from '#~/shared/utils.js'
import { readString } from '#~/shared/utils.js'

import type { ChromeExtensionRuntime } from '../runtime.js'

export async function handleRuntimeMessage(
  runtime: ChromeExtensionRuntime,
  message: UnknownRecord,
  sender?: chrome.runtime.MessageSender
): Promise<unknown> {
  const type = readString(message, 'type')

  switch (type) {
    case 'popup:getState':
    case 'runtime:getStatus':
      return runtime.getStatus()
    case 'popup:openOptions':
      return runtime.openOptionsPage()
    case 'popup:createRouteClientFromActiveTab':
      return runtime.createRouteClientFromActiveTab(readString(message, 'clientName'))
    case 'popup:injectActiveTab': {
      const routeClient = await runtime.resolvePopupRouteClient(readString(message, 'routeClientId'))
      const tab = await runtime.requireMatchingActiveTab(routeClient)
      await runtime.ensureScriptsInjected(tab.id, routeClient, true)
      return { injected: true, routeClientId: routeClient.id, tabId: tab.id }
    }
    case 'popup:grantActiveTabOrigin': {
      const routeClient = await runtime.resolvePopupRouteClient(readString(message, 'routeClientId'))
      const pattern = readString(message, 'pattern')
      if (!pattern) {
        throw new Error('A granted host origin pattern is required.')
      }
      return runtime.persistGrantedActiveTabOrigin(routeClient.id, pattern)
    }
    case 'popup:startRecording': {
      const routeClient = await runtime.resolvePopupRouteClient(readString(message, 'routeClientId'))
      return runtime.startRecording(routeClient.id)
    }
    case 'popup:stopRecording': {
      const name = readString(message, 'name')
      const description = readString(message, 'description')
      return runtime.stopRecording({
        ...(name ? { name } : {}),
        ...(description ? { description } : {})
      })
    }
    case 'popup:startSelectorCapture': {
      const routeClient = await runtime.resolvePopupRouteClient(readString(message, 'routeClientId'))
      return runtime.startSelectorCapture(routeClient.id)
    }
    case 'popup:clearPendingSelectorCapture':
      runtime.pendingSelectorCapture = undefined
      return { cleared: true }
    case 'popup:runRecording': {
      const routeClientId = readString(message, 'routeClientId')
      const recordingId = readString(message, 'recordingId')
      if (!routeClientId || !recordingId) {
        throw new Error('routeClientId and recordingId are required')
      }
      return runtime.runRouteRecording(routeClientId, recordingId, undefined)
    }
    case 'runtime:refresh':
      await runtime.refresh()
      return { refreshed: true }
    case 'runtime:clearInvocationTelemetry':
      await runtime.clearInvocationTelemetry(readString(message, 'clientKey'))
      return { cleared: true }
    case 'page:selectorCaptured':
      return runtime.handleSelectorCapturedMessage(message, sender)
    default:
      return undefined
  }
}

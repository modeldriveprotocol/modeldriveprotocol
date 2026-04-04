import { type UnknownRecord, asRecord, serializeError } from '#~/shared/utils.js'
import { ChromeExtensionRuntime } from '#~/background/runtime.js'
import { STORAGE_KEY } from '#~/shared/config.js'
import {
  clearBackgroundStartupDiagnostics,
  saveBackgroundStartupDiagnostics
} from '#~/shared/storage.js'

let backgroundStarted = false

export function startBackground(): void {
  if (backgroundStarted) {
    return
  }

  backgroundStarted = true

  const runtime = new ChromeExtensionRuntime()
  const reportStartupError = async (stage: string, error: unknown) => {
    await saveBackgroundStartupDiagnostics({
      stage,
      updatedAt: new Date().toISOString(),
      ...serializeError(error)
    })
  }
  const initializeRuntime = async (stage: string) => {
    try {
      await runtime.initialize()
      await clearBackgroundStartupDiagnostics()
    } catch (error) {
      await reportStartupError(stage, error)
    }
  }

  globalThis.addEventListener('error', (event) => {
    void reportStartupError('global:error', event.error ?? event.message)
  })
  globalThis.addEventListener('unhandledrejection', (event) => {
    void reportStartupError('global:unhandledrejection', event.reason)
  })

  if (chrome.sidePanel?.setPanelBehavior) {
    void chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true
    })
  }

  chrome.runtime.onInstalled.addListener(() => {
    if (chrome.sidePanel?.setPanelBehavior) {
      void chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true
      })
    }
    void initializeRuntime('runtime:onInstalled')
  })

  chrome.runtime.onStartup.addListener(() => {
    if (chrome.sidePanel?.setPanelBehavior) {
      void chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true
      })
    }
    void initializeRuntime('runtime:onStartup')
  })

  chrome.storage.onChanged.addListener((changes: unknown, areaName: string) => {
    if (
      areaName === 'local' &&
      changes &&
      typeof changes === 'object' &&
      !Array.isArray(changes) &&
      STORAGE_KEY in changes
    ) {
      void runtime.refresh()
    }
  })

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
      runtime.handleTabRemoved(tabId)
      return
    }

    if (changeInfo.status !== 'complete') {
      return
    }

    void runtime.handleTabUpdated(tabId, typeof tab.url === 'string' ? tab.url : undefined).catch(
      () => undefined
    )
  })

  chrome.tabs.onRemoved.addListener((tabId: number) => {
    runtime.handleTabRemoved(tabId)
  })

  chrome.runtime.onMessage.addListener(
    (
      message: UnknownRecord,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: { ok: boolean; data?: unknown; error?: ReturnType<typeof serializeError> }) => void
    ) => {
      void runtime
        .handleRuntimeMessage(asRecord(message), sender)
        .then((data) => {
          sendResponse({
            ok: true,
            ...(data !== undefined ? { data } : {})
          })
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            error: serializeError(error)
          })
        })

      return true
    }
  )

  void initializeRuntime('background:start')
}

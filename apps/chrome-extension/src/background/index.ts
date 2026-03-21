import { type UnknownRecord, asRecord, serializeError } from '../shared/utils.js'
import { ChromeExtensionRuntime } from './runtime.js'

const runtime = new ChromeExtensionRuntime()

chrome.runtime.onInstalled.addListener(() => {
  void runtime.initialize()
})

chrome.runtime.onStartup.addListener(() => {
  void runtime.initialize()
})

chrome.storage.onChanged.addListener((_changes: unknown, areaName: string) => {
  if (areaName === 'local') {
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
    _sender: unknown,
    sendResponse: (response: { ok: boolean; data?: unknown; error?: ReturnType<typeof serializeError> }) => void
  ) => {
    void runtime
      .handlePopupMessage(asRecord(message))
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

void runtime.initialize()

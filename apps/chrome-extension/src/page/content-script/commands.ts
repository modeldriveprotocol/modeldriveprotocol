import { normalizeForMessaging, serializeError } from '#~/shared/utils.js'
import type {
  PageCommand,
  PageCommandEnvelope,
  PageCommandResponse
} from '../messages.js'
import { PAGE_COMMAND_CHANNEL } from '../messages.js'
import {
  buildPageSnapshot,
  clickElement,
  fillElement,
  focusElement,
  pressKey,
  queryElements,
  scrollElementIntoView,
  scrollToPosition
} from './elements.js'
import { callMainWorld } from './main-world.js'
import {
  cancelSelectorCapture,
  getRecordingState,
  getSelectorCaptureState,
  startRecording,
  startSelectorCapture,
  stopRecording
} from './recording.js'
import {
  waitForHidden,
  waitForSelector,
  waitForText,
  waitForUrl,
  waitForVisible
} from './waits.js'

export function registerCommandListener(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: PageCommandEnvelope | undefined,
      _sender: unknown,
      sendResponse: (response: PageCommandResponse) => void
    ) => {
      if (!message || message.channel !== PAGE_COMMAND_CHANNEL) {
        return undefined
      }

      void handlePageCommand(message.command)
        .then((data) => sendResponse({ ok: true, data: normalizeForMessaging(data) }))
        .catch((error) => sendResponse({ ok: false, error: serializeError(error) }))

      return true
    }
  )
}

export async function handlePageCommand(command: PageCommand): Promise<unknown> {
  switch (command.type) {
    case 'ping':
      return { ok: true, title: document.title, url: location.href }
    case 'getSnapshot':
      return buildPageSnapshot(command.maxTextLength ?? 4000)
    case 'queryElements':
      return queryElements(command.selector, command.maxResults ?? 20)
    case 'click':
      return clickElement(command.selector, command.index ?? 0)
    case 'fill':
      return fillElement(command.selector, command.value, command.index ?? 0)
    case 'focus':
      return focusElement(command.selector, command.index ?? 0)
    case 'pressKey':
      return pressKey(command)
    case 'scrollIntoView':
      return scrollElementIntoView(command)
    case 'scrollTo':
      return scrollToPosition(command.top, command.left, command.behavior ?? 'auto')
    case 'waitForText':
      return waitForText(command.text, command.timeoutMs ?? 10_000)
    case 'waitForSelector':
      return waitForSelector(command.selector, command.timeoutMs ?? 10_000)
    case 'waitForVisible':
      return waitForVisible(command)
    case 'waitForHidden':
      return waitForHidden(command)
    case 'waitForUrl':
      return waitForUrl(command)
    case 'runMainWorld':
      return callMainWorld(command.action, command.args, command.timeoutMs ?? 10_000)
    case 'startRecording':
      return startRecording()
    case 'stopRecording':
      return stopRecording()
    case 'getRecordingState':
      return getRecordingState()
    case 'startSelectorCapture':
      return startSelectorCapture()
    case 'cancelSelectorCapture':
      return cancelSelectorCapture()
    case 'getSelectorCaptureState':
      return getSelectorCaptureState()
  }
}

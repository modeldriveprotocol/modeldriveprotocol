import { createRequestId } from '#~/shared/utils.js'
import type {
  MainWorldAction,
  MainWorldRequest,
  MainWorldResponse
} from '../messages.js'
import {
  MAIN_WORLD_REQUEST_EVENT,
  MAIN_WORLD_RESPONSE_EVENT
} from '../messages.js'

export function callMainWorld(action: MainWorldAction, args: unknown, timeoutMs: number): Promise<unknown> {
  const requestId = createRequestId('page')

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for main world action "${action}"`))
    }, timeoutMs)

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<MainWorldResponse>).detail
      if (!detail || detail.requestId !== requestId) {
        return
      }

      cleanup()

      if (!detail.ok) {
        reject(new Error(detail.error?.message ?? 'Main world action failed'))
        return
      }

      resolve(detail.data)
    }

    const cleanup = () => {
      window.clearTimeout(timeout)
      window.removeEventListener(MAIN_WORLD_RESPONSE_EVENT, listener as EventListener)
    }

    window.addEventListener(MAIN_WORLD_RESPONSE_EVENT, listener as EventListener)
    const detail: MainWorldRequest = { requestId, action, ...(args !== undefined ? { args } : {}) }
    window.dispatchEvent(new CustomEvent(MAIN_WORLD_REQUEST_EVENT, { detail }))
  })
}

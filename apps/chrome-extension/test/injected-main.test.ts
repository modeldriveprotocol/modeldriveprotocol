// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import { installInjectedMainWorldBridge } from '../src/page/injected-main.js'
import {
  MAIN_WORLD_REQUEST_EVENT,
  MAIN_WORLD_RESPONSE_EVENT,
  type MainWorldAction,
  type MainWorldResponse
} from '../src/page/messages.js'

function resetBridgeState() {
  delete window.__MDP_EXTENSION_BRIDGE__
  delete window.__MDP_EXTENSION_BRIDGE_INSTALLED__
  delete window.__MDP_EXTENSION_EXECUTED_SCRIPT_IDS__
}

async function sendMainWorldRequest(action: MainWorldAction, args?: unknown): Promise<MainWorldResponse> {
  const requestId = `${action}-request`

  return await new Promise((resolve) => {
    const handleResponse = (event: Event) => {
      const detail = (event as CustomEvent<MainWorldResponse>).detail
      if (detail?.requestId !== requestId) {
        return
      }

      window.removeEventListener(MAIN_WORLD_RESPONSE_EVENT, handleResponse)
      resolve(detail)
    }

    window.addEventListener(MAIN_WORLD_RESPONSE_EVENT, handleResponse)
    window.dispatchEvent(new CustomEvent(MAIN_WORLD_REQUEST_EVENT, {
      detail: {
        requestId,
        action,
        ...(args !== undefined ? { args } : {})
      }
    }))
  })
}

describe('chrome extension injected main-world bridge', () => {
  afterEach(() => {
    resetBridgeState()
  })

  it('accepts only canonical path identifiers', async () => {
    installInjectedMainWorldBridge()
    window.__MDP_EXTENSION_BRIDGE__?.registerPath('/app/state', (args) => args)

    await expect(
      window.__MDP_EXTENSION_BRIDGE__?.callPath('/app/state', { includeDrafts: true })
    ).resolves.toEqual({ includeDrafts: true })

    await expect(
      window.__MDP_EXTENSION_BRIDGE__?.callPath('app.state', { includeDrafts: true })
    ).rejects.toThrow('Unknown injected path "app.state"')
  })

  it('rejects legacy toolArgs payloads for callPath requests', async () => {
    installInjectedMainWorldBridge()
    window.__MDP_EXTENSION_BRIDGE__?.registerPath('/app/state', (args) => args)

    const response = await sendMainWorldRequest('callPath', {
      path: '/app/state',
      toolArgs: { includeDrafts: true }
    })

    expect(response).toMatchObject({
      requestId: 'callPath-request',
      ok: false,
      error: {
        message: 'Injected path invocations must use "pathArgs"'
      }
    })
  })
})

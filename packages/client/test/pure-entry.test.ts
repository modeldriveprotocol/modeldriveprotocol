import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  HttpLoopClientTransport,
  WebSocketClientTransport
} from '../src/pure.js'
import type {
  WebSocketClassLike,
  WebSocketCloseEventLike,
  WebSocketEventLike,
  WebSocketLike,
  WebSocketMessageEventLike
} from '../src/pure.js'

class FakeWebSocket implements WebSocketLike {
  readyState = 0
  private readonly listeners = new Map<
    'open' | 'message' | 'error' | 'close',
    Array<(
      event: WebSocketEventLike | WebSocketMessageEventLike | WebSocketCloseEventLike
    ) => void>
  >()

  addEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (
      event: WebSocketEventLike | WebSocketMessageEventLike | WebSocketCloseEventLike
    ) => void
  ): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  close(): void {
    this.readyState = 3
    this.emit('close')
  }

  send(): void {}

  emit(
    type: 'open' | 'message' | 'error' | 'close',
    event: WebSocketEventLike | WebSocketMessageEventLike | WebSocketCloseEventLike = {}
  ): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

class FakeAbortSignal {
  aborted = false
}

class FakeAbortController {
  readonly signal = new FakeAbortSignal()

  abort(): void {
    this.signal.aborted = true
  }
}

const originalWebSocket = globalThis.WebSocket
const originalFetch = globalThis.fetch
const originalAbortController = globalThis.AbortController
const originalTextDecoder = globalThis.TextDecoder

afterEach(() => {
  vi.restoreAllMocks()

  if (originalWebSocket) {
    globalThis.WebSocket = originalWebSocket
  } else {
    Reflect.deleteProperty(globalThis, 'WebSocket')
  }

  if (originalFetch) {
    globalThis.fetch = originalFetch
  } else {
    Reflect.deleteProperty(globalThis, 'fetch')
  }

  if (originalAbortController) {
    globalThis.AbortController = originalAbortController
  } else {
    Reflect.deleteProperty(globalThis, 'AbortController')
  }

  if (originalTextDecoder) {
    globalThis.TextDecoder = originalTextDecoder
  } else {
    Reflect.deleteProperty(globalThis, 'TextDecoder')
  }
})

describe('pure entry', () => {
  it('does not fall back to the global websocket implementation', async () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket

    const transport = new WebSocketClientTransport('ws://127.0.0.1:47372')

    await expect(transport.connect()).rejects.toThrow(
      'No WebSocket implementation is bound for @modeldriveprotocol/client/pure'
    )
  })

  it('does not fall back to the global fetch implementation', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ sessionId: 'session-01' })
    })) as typeof fetch
    globalThis.AbortController = FakeAbortController as unknown as typeof AbortController

    const transport = new HttpLoopClientTransport('http://127.0.0.1:47372')

    await expect(transport.connect()).rejects.toThrow(
      'No fetch implementation is bound for @modeldriveprotocol/client/pure'
    )
  })

  it('does not fall back to the global binary websocket decoder', async () => {
    const sockets: FakeWebSocket[] = []

    class FakeWebSocketClass extends FakeWebSocket {
      constructor(url: string) {
        super()
        void url
        sockets.push(this)
      }
    }

    globalThis.TextDecoder = class {
      decode(): string {
        return '{"type":"ping","timestamp":123}'
      }
    } as unknown as typeof TextDecoder

    const transport = new WebSocketClientTransport('ws://127.0.0.1:47372', {
      webSocketClass: FakeWebSocketClass as WebSocketClassLike
    })
    const onMessage = vi.fn()

    transport.onMessage(onMessage)

    const connectPromise = transport.connect()
    await vi.waitFor(() => {
      expect(sockets).toHaveLength(1)
    })

    if (!sockets[0]) {
      throw new Error('Expected first socket to exist')
    }

    sockets[0].readyState = 1
    sockets[0].emit('open')
    await connectPromise

    sockets[0].emit('message', {
      data: Uint8Array.from([1, 2, 3])
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(onMessage).not.toHaveBeenCalled()
  })
})

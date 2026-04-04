import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FetchRequestOptions, FetchResponseLike } from '../src/node.js'
import type {
  WebSocketCloseEventLike,
  WebSocketEventLike,
  WebSocketLike,
  WebSocketMessageEventLike
} from '../src/ws-client.js'

class FakeWebSocket implements WebSocketLike {
  readyState = 0
  readonly sent: string[] = []

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

  send(data: string): void {
    this.sent.push(data)
  }

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

  private readonly listeners: Array<() => void> = []

  onAbort(listener: () => void): void {
    this.listeners.push(listener)
  }

  emitAbort(): void {
    this.aborted = true

    for (const listener of this.listeners) {
      listener()
    }
  }
}

class FakeAbortController {
  readonly signal = new FakeAbortSignal()

  abort(): void {
    this.signal.emitAbort()
  }
}

function createJsonResponse(
  payload: unknown,
  options: { ok?: boolean, status?: number } = {}
): FetchResponseLike {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload
  }
}

const originalFetch = globalThis.fetch
const originalAbortController = globalThis.AbortController

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  vi.doUnmock('ws')

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
})

describe('node entry', () => {
  it('binds the node websocket implementation for default clients', async () => {
    const sockets: FakeWebSocket[] = []

    class FakeNodeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super()
        void url
        sockets.push(this)
      }
    }

    vi.doMock('ws', () => ({
      default: FakeNodeWebSocket
    }))

    const { createMdpClient } = await import('../src/node.js')

    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:47372',
      client: {
        id: 'node-01',
        name: 'Node Client'
      }
    })

    const connectPromise = client.connect()

    await vi.waitFor(() => {
      expect(sockets).toHaveLength(1)
    })

    if (sockets[0]) {
      sockets[0].readyState = 1
    }

    sockets[0]?.emit('open')
    await connectPromise

    client.register()

    expect(sockets[0]?.sent[0]).toContain('"type":"registerClient"')
  })

  it('binds the node websocket transport class', async () => {
    const sockets: FakeWebSocket[] = []

    class FakeNodeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super()
        void url
        sockets.push(this)
      }
    }

    vi.doMock('ws', () => ({
      default: FakeNodeWebSocket
    }))

    const { WebSocketClientTransport } = await import('../src/node.js')
    const transport = new WebSocketClientTransport('ws://127.0.0.1:47372')
    const connectPromise = transport.connect()

    await vi.waitFor(() => {
      expect(sockets).toHaveLength(1)
    })

    if (sockets[0]) {
      sockets[0].readyState = 1
    }

    sockets[0]?.emit('open')
    await connectPromise
  })

  it('binds the node http loop transport class', async () => {
    const calls: Array<{ url: string, init?: FetchRequestOptions }> = []

    globalThis.fetch = vi.fn(async (url: string, init?: FetchRequestOptions) => {
      calls.push({ url, init })

      if (url.endsWith('/connect')) {
        return createJsonResponse({ sessionId: 'session-01' })
      }

      if (url.includes('/poll')) {
        return await new Promise((_, reject) => {
          const signal = init?.signal as (FakeAbortSignal | undefined)
          signal?.onAbort(() => {
            reject(new Error('aborted'))
          })
        })
      }

      if (url.endsWith('/disconnect')) {
        return createJsonResponse({})
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    }) as typeof fetch
    globalThis.AbortController = FakeAbortController as unknown as typeof AbortController

    const { HttpLoopClientTransport } = await import('../src/node.js')
    const transport = new HttpLoopClientTransport('http://127.0.0.1:47372')

    await transport.connect()
    await vi.waitFor(() => {
      expect(calls.some((call) => call.url.includes('/poll'))).toBe(true)
    })
    await transport.close()

    expect(calls.map((call) => call.url)).toEqual([
      'http://127.0.0.1:47372/mdp/http-loop/connect',
      'http://127.0.0.1:47372/mdp/http-loop/poll?sessionId=session-01&waitMs=25000',
      'http://127.0.0.1:47372/mdp/http-loop/disconnect'
    ])
    expect(calls[1]?.init?.signal).toBeInstanceOf(FakeAbortSignal)
  })
})

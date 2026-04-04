import { describe, expect, it, vi } from 'vitest'

import type { ClientToServerMessage, ServerToClientMessage } from '@modeldriveprotocol/protocol'
import { createMdpClient } from '../src/mdp-client.js'
import type {
  ClientTransport,
  FetchRequestOptions,
  FetchResponseLike
} from '../src/types.js'
import type {
  WebSocketClassLike,
  WebSocketCloseEventLike,
  WebSocketEventLike,
  WebSocketLike,
  WebSocketMessageEventLike
} from '../src/ws-client.js'

class FakeTransport implements ClientTransport {
  readonly sent: ClientToServerMessage[] = []

  private messageHandler?: (message: ServerToClientMessage) => void
  private closeHandler?: () => void

  connect = vi.fn(async () => {})

  send = vi.fn((message: ClientToServerMessage) => {
    this.sent.push(message)
  })

  close = vi.fn(async () => {})

  onMessage(handler: (message: ServerToClientMessage) => void): void {
    this.messageHandler = handler
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler
  }

  emit(message: ServerToClientMessage): void {
    this.messageHandler?.(message)
  }

  emitClose(): void {
    this.closeHandler?.()
  }
}

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

describe('MdpClient', () => {
  it('uses an injected fetch implementation for the default http transport', async () => {
    const calls: Array<{ url: string, init?: FetchRequestOptions }> = []

    const client = createMdpClient({
      serverUrl: 'http://127.0.0.1:7070',
      client: {
        id: 'http-01',
        name: 'HTTP Client'
      },
      defaultTransport: {
        fetch: {
          fetch: vi.fn(async (url: string, init?: FetchRequestOptions) => {
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
          }),
          abortControllerFactory: () => new FakeAbortController()
        }
      }
    })

    await client.connect()
    await vi.waitFor(() => {
      expect(calls.some((call) => call.url.includes('/poll'))).toBe(true)
    })
    await client.disconnect()

    expect(calls.map((call) => call.url)).toEqual([
      'http://127.0.0.1:7070/mdp/http-loop/connect',
      'http://127.0.0.1:7070/mdp/http-loop/poll?sessionId=session-01&waitMs=25000',
      'http://127.0.0.1:7070/mdp/http-loop/disconnect'
    ])
    expect(calls[1]?.init?.signal).toBeInstanceOf(FakeAbortSignal)
  })

  it('uses the default transport fetch binding for cookie auth bootstrap', async () => {
    const authCalls: Array<{ url: string, init?: FetchRequestOptions }> = []
    const sockets: FakeWebSocket[] = []

    class FakeWebSocketClass extends FakeWebSocket {
      constructor(url: string) {
        super()
        void url
        sockets.push(this)
      }
    }

    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      auth: {
        scheme: 'Bearer',
        token: 'client-token'
      },
      defaultTransport: {
        fetch: {
          fetch: vi.fn(async (url: string, init?: FetchRequestOptions) => {
            authCalls.push({ url, init })
            return createJsonResponse({})
          }),
          abortControllerFactory: () => new FakeAbortController()
        },
        webSocket: {
          webSocketClass: FakeWebSocketClass as WebSocketClassLike
        }
      }
    })

    const connectPromise = client.connect()

    await vi.waitFor(() => {
      expect(authCalls).toHaveLength(1)
      expect(sockets).toHaveLength(1)
    })

    if (sockets[0]) {
      sockets[0].readyState = 1
    }
    sockets[0]?.emit('open')
    await connectPromise
    await client.disconnect()

    expect(authCalls).toEqual([
      {
        url: 'http://127.0.0.1:7070/mdp/auth',
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            auth: {
              scheme: 'Bearer',
              token: 'client-token'
            }
          }),
          credentials: 'include'
        }
      }
    ])
  })

  it('uses an injected websocket class for the default websocket transport', async () => {
    const sockets: FakeWebSocket[] = []

    class FakeWebSocketClass extends FakeWebSocket {
      constructor(url: string) {
        super()
        void url
        sockets.push(this)
      }
    }

    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      defaultTransport: {
        webSocket: {
          webSocketClass: FakeWebSocketClass as WebSocketClassLike
        }
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

    expect(sockets[0]?.sent).toEqual([
      JSON.stringify({
        type: 'registerClient',
        client: {
          id: 'browser-01',
          name: 'Browser Client',
          paths: []
        }
      })
    ])
  })

  it('requires a connection before register', () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'http://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    expect(() => client.register()).toThrow('MDP client is not connected')
  })

  it('registers exposed paths after connect', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      auth: {
        scheme: 'Bearer',
        token: 'client-token'
      },
      transport
    })

    client.expose('/goods', {
      method: 'GET',
      description: 'List goods'
    }, async () => ({ list: [], total: 0 }))
    client.expose('/overview/skill.md', '# Overview')

    await client.connect()
    client.register({
      description: 'Test browser client'
    })

    expect(transport.connect).toHaveBeenCalledOnce()
    expect(transport.send).toHaveBeenCalledWith({
      type: 'registerClient',
      client: {
        id: 'browser-01',
        name: 'Browser Client',
        description: 'Test browser client',
        paths: [
          {
            type: 'endpoint',
            path: '/goods',
            method: 'GET',
            description: 'List goods'
          },
          {
            type: 'skill',
            path: '/overview/skill.md',
            contentType: 'text/markdown'
          }
        ]
      },
      auth: {
        scheme: 'Bearer',
        token: 'client-token'
      }
    })
  })

  it('responds to ping and routed path invocations', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    client.expose('/goods/:id', {
      method: 'GET'
    }, async ({ params, queries }, context) => ({
      id: params.id,
      page: queries.page,
      authToken: context.auth?.token
    }))

    transport.emit({
      type: 'ping',
      timestamp: 123
    })
    transport.emit({
      type: 'callClient',
      requestId: 'req-01',
      clientId: 'browser-01',
      method: 'GET',
      path: '/goods/sku-01',
      query: {
        page: 2
      },
      auth: {
        token: 'host-token'
      }
    })

    await vi.waitFor(() => {
      expect(transport.sent).toEqual([
        {
          type: 'pong',
          timestamp: 123
        },
        {
          type: 'callClientResult',
          requestId: 'req-01',
          ok: true,
          data: {
            id: 'sku-01',
            page: 2,
            authToken: 'host-token'
          }
        }
      ])
    })
  })

  it('registers invocation middleware through the public client API', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })
    const events: string[] = []

    client.useInvocationMiddleware(async (invocation, next) => {
      events.push(
        `before:${invocation.type}:${invocation.method}:${invocation.path}:${invocation.queries.page}`
      )
      invocation.queries.page = 7
      const result = await next()
      events.push(`after:${JSON.stringify(result)}`)
      return result
    })

    client.expose('/goods', {
      method: 'GET'
    }, async ({ queries }) => ({
      page: queries.page
    }))

    transport.emit({
      type: 'callClient',
      requestId: 'req-mw-01',
      clientId: 'browser-01',
      method: 'GET',
      path: '/goods',
      query: {
        page: 1
      }
    })

    await vi.waitFor(() => {
      expect(transport.sent).toEqual([
        {
          type: 'callClientResult',
          requestId: 'req-mw-01',
          ok: true,
          data: {
            page: 7
          }
        }
      ])
    })

    expect(events).toEqual([
      'before:endpoint:GET:/goods:1',
      'after:{"page":7}'
    ])
  })

  it('registers diverse path descriptors through expose()', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    client
      .expose('/search-dom', {
        method: 'POST'
      }, async (request, context) => ({
        query:
          request.body && typeof request.body === 'object'
            ? (request.body as { query?: string }).query
            : undefined,
        authToken: context.auth?.token
      }))
      .expose('/summaries/prompt.md', {}, async () => ({
        messages: [
          {
            role: 'user',
            content: 'Summarize in a neutral tone.'
          }
        ]
      }))
      .expose('/page/review/skill.md', {
        contentType: 'application/json'
      }, async () => ({
        findings: ['No issues found']
      }))
      .expose('/webpage/selection', {
        method: 'GET',
        contentType: 'text/plain'
      }, async () => ({
        mimeType: 'text/plain',
        text: 'Selected text'
      }))

    const paths = client.describe().paths

    expect(paths).toEqual([
      {
        type: 'endpoint',
        path: '/search-dom',
        method: 'POST',
      },
      {
        type: 'prompt',
        path: '/summaries/prompt.md',
      },
      {
        type: 'skill',
        path: '/page/review/skill.md',
        contentType: 'application/json',
      },
      {
        type: 'endpoint',
        path: '/webpage/selection',
        method: 'GET',
        contentType: 'text/plain',
      }
    ])

    transport.emit({
      type: 'callClient',
      requestId: 'req-search',
      clientId: 'browser-01',
      method: 'POST',
      path: '/search-dom',
      body: {
        query: 'mdp'
      },
      auth: {
        token: 'host-token'
      }
    })
    transport.emit({
      type: 'callClient',
      requestId: 'req-selection',
      clientId: 'browser-01',
      method: 'GET',
      path: '/webpage/selection'
    })

    await vi.waitFor(() => {
      expect(transport.sent).toEqual([
        {
          type: 'callClientResult',
          requestId: 'req-search',
          ok: true,
          data: {
            query: 'mdp',
            authToken: 'host-token'
          }
        },
        {
          type: 'callClientResult',
          requestId: 'req-selection',
          ok: true,
          data: {
            mimeType: 'text/plain',
            text: 'Selected text'
          }
        }
      ])
    })
  })

  it('syncs the current path catalog after registration', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    client.expose('/goods', {
      method: 'GET'
    }, async () => ({ list: [], total: 0 }))

    await client.connect()
    client.register()
    transport.sent.length = 0

    client.unexpose('/goods', 'GET')
    client.syncCatalog()

    expect(transport.sent).toEqual([
      {
        type: 'updateClientCatalog',
        clientId: 'browser-01',
        paths: []
      }
    ])
  })
})

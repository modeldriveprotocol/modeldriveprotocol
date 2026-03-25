import { describe, expect, it, vi } from 'vitest'

import type { ClientToServerMessage, ServerToClientMessage } from '@modeldriveprotocol/protocol'
import { createMdpClient } from '../src/mdp-client.js'
import type { ClientTransport } from '../src/types.js'

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

describe('MdpClient', () => {
  it('requires a connection before register', () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'http://127.0.0.1:7070',
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

    expect(() => client.register()).toThrow('MDP client is not connected')
  })

  it('registers exposed capabilities after connect', async () => {
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

    client.exposeTool('searchDom', async () => ({ matches: 1 }), {
      description: 'Search the DOM'
    })

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
        tools: [
          {
            name: 'searchDom',
            description: 'Search the DOM'
          }
        ],
        prompts: [],
        skills: [],
        resources: []
      },
      auth: {
        scheme: 'Bearer',
        token: 'client-token'
      }
    })
  })

  it('responds to ping and routed invocation messages', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    client.exposeTool('searchDom', async ({ query }, context) => ({
      query,
      matches: 3,
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
      kind: 'tool',
      name: 'searchDom',
      args: {
        query: 'modeldriveprotocol'
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
            query: 'modeldriveprotocol',
            matches: 3,
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
      events.push(`before:${invocation.kind}:${invocation.name}`)
      invocation.args = {
        ...(invocation.args ?? {}),
        query: 'patched'
      }
      const result = await next()
      events.push(`after:${JSON.stringify(result)}`)
      return result
    })

    client.exposeTool('searchDom', async ({ query }) => ({
      query,
      matches: 3
    }))

    transport.emit({
      type: 'callClient',
      requestId: 'req-mw-01',
      clientId: 'browser-01',
      kind: 'tool',
      name: 'searchDom',
      args: {
        query: 'original'
      }
    })

    await vi.waitFor(() => {
      expect(transport.sent).toEqual([
        {
          type: 'callClientResult',
          requestId: 'req-mw-01',
          ok: true,
          data: {
            query: 'patched',
            matches: 3
          }
        }
      ])
    })

    expect(events).toEqual([
      'before:tool:searchDom',
      'after:{"query":"patched","matches":3}'
    ])
  })

  it('removes invocation middleware through the public client API', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })
    const middleware = vi.fn(async (_invocation, next) => next())

    client
      .useInvocationMiddleware(middleware)
      .removeInvocationMiddleware(middleware)
      .exposeTool('searchDom', async () => ({ matches: 1 }))

    transport.emit({
      type: 'callClient',
      requestId: 'req-mw-02',
      clientId: 'browser-01',
      kind: 'tool',
      name: 'searchDom'
    })

    await vi.waitFor(() => {
      expect(transport.sent).toEqual([
        {
          type: 'callClientResult',
          requestId: 'req-mw-02',
          ok: true,
          data: {
            matches: 1
          }
        }
      ])
    })

    expect(middleware).not.toHaveBeenCalled()
  })

  it('serializes handler failures from routed invocations', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    transport.emit({
      type: 'callClient',
      requestId: 'req-02',
      clientId: 'browser-01',
      kind: 'tool',
      name: 'missingTool'
    })

    await vi.waitFor(() => {
      expect(transport.sent).toEqual([
        {
          type: 'callClientResult',
          requestId: 'req-02',
          ok: false,
          error: {
            code: 'handler_error',
            message: 'Unknown tool "missingTool"'
          }
        }
      ])
    })
  })

  it('updates registration auth via setAuth', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    await client.connect()
    client.setAuth({
      token: 'rotated-token'
    })
    client.register()

    expect(transport.sent[0]).toEqual({
      type: 'registerClient',
      client: {
        id: 'browser-01',
        name: 'Browser Client',
        tools: [],
        prompts: [],
        skills: [],
        resources: []
      },
      auth: {
        token: 'rotated-token'
      }
    })
  })

  it('syncs updated capability groups after registration', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    client.exposeTool('searchDom', async () => ({ matches: 1 }))

    await client.connect()
    client.register()

    client.removeTool('searchDom')
    client.exposePrompt('summarizeSelection', async () => ({
      messages: [{ role: 'user', content: 'Summarize the current selection.' }]
    }))
    client.syncCapabilities({
      tools: client.describe().tools,
      prompts: client.describe().prompts
    })

    expect(transport.sent).toEqual([
      {
        type: 'registerClient',
        client: {
          id: 'browser-01',
          name: 'Browser Client',
          tools: [
            {
              name: 'searchDom'
            }
          ],
          prompts: [],
          skills: [],
          resources: []
        }
      },
      {
        type: 'updateClientCapabilities',
        clientId: 'browser-01',
        capabilities: {
          tools: [],
          prompts: [
            {
              name: 'summarizeSelection'
            }
          ]
        }
      }
    ])
  })

  it('reconnects and re-registers after an unexpected disconnect', async () => {
    vi.useFakeTimers()

    try {
      const transport = new FakeTransport()
      const client = createMdpClient({
        serverUrl: 'ws://127.0.0.1:7070',
        client: {
          id: 'browser-01',
          name: 'Browser Client'
        },
        reconnect: {
          enabled: true,
          initialDelayMs: 10,
          maxDelayMs: 10
        },
        transport
      })

      client.exposeTool('searchDom', async () => ({ matches: 1 }))

      await client.connect()
      client.register()
      transport.emitClose()

      await vi.advanceTimersByTimeAsync(10)

      await vi.waitFor(() => {
        expect(transport.connect).toHaveBeenCalledTimes(2)
        expect(
          transport.sent.filter((message) => message.type === 'registerClient')
        ).toHaveLength(2)
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not reconnect after an explicit disconnect', async () => {
    vi.useFakeTimers()

    try {
      const transport = new FakeTransport()
      transport.close = vi.fn(async () => {
        transport.emitClose()
      })

      const client = createMdpClient({
        serverUrl: 'ws://127.0.0.1:7070',
        client: {
          id: 'browser-01',
          name: 'Browser Client'
        },
        reconnect: {
          enabled: true,
          initialDelayMs: 10,
          maxDelayMs: 10
        },
        transport
      })

      await client.connect()
      client.register()
      await client.disconnect()
      await vi.advanceTimersByTimeAsync(50)

      expect(transport.connect).toHaveBeenCalledOnce()
      expect(
        transport.sent.filter((message) => message.type === 'registerClient')
      ).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps retrying reconnect attempts until the transport becomes available again', async () => {
    vi.useFakeTimers()

    try {
      const transport = new FakeTransport()
      let reconnectFailuresRemaining = 2

      transport.connect = vi.fn(async () => {
        if (transport.connect.mock.calls.length > 1 && reconnectFailuresRemaining > 0) {
          reconnectFailuresRemaining -= 1
          throw new Error('server unavailable')
        }
      })

      const client = createMdpClient({
        serverUrl: 'ws://127.0.0.1:7070',
        client: {
          id: 'browser-01',
          name: 'Browser Client'
        },
        reconnect: {
          enabled: true,
          initialDelayMs: 10,
          maxDelayMs: 10
        },
        transport
      })

      await client.connect()
      client.register()
      transport.emitClose()

      await vi.advanceTimersByTimeAsync(10)
      await vi.advanceTimersByTimeAsync(10)
      await vi.advanceTimersByTimeAsync(10)

      await vi.waitFor(() => {
        expect(transport.connect).toHaveBeenCalledTimes(4)
        expect(
          transport.sent.filter((message) => message.type === 'registerClient')
        ).toHaveLength(2)
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps retrying the initial connect until the transport becomes available', async () => {
    vi.useFakeTimers()

    try {
      const transport = new FakeTransport()
      let initialFailuresRemaining = 2

      transport.connect = vi.fn(async () => {
        if (initialFailuresRemaining > 0) {
          initialFailuresRemaining -= 1
          throw new Error('server unavailable')
        }
      })

      const events: string[] = []
      const client = createMdpClient({
        serverUrl: 'ws://127.0.0.1:7070',
        client: {
          id: 'browser-01',
          name: 'Browser Client'
        },
        reconnect: {
          enabled: true,
          initialDelayMs: 10,
          maxDelayMs: 10,
          onEvent: (event) => {
            events.push(event.type)
          }
        },
        transport
      })

      const connectPromise = client.connect()

      await vi.advanceTimersByTimeAsync(10)
      await vi.advanceTimersByTimeAsync(10)
      await vi.advanceTimersByTimeAsync(10)
      await connectPromise

      expect(transport.connect).toHaveBeenCalledTimes(3)
      expect(events).toEqual([
        'reconnectScheduled',
        'reconnectAttempt',
        'reconnectScheduled',
        'reconnectAttempt',
        'reconnected'
      ])

      expect(() => client.register()).not.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })

  it('requires registration before syncing capabilities', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    await client.connect()

    expect(() => client.syncTools()).toThrow('MDP client is not registered')
  })

  it('registers markdown skill documents', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    client.exposeSkill(
      'workspace/review',
      '# Workspace Review\n\nReview the workspace root.\n\nYou can read `workspace/review/files` for file-level guidance.'
    )

    await client.connect()
    client.register()

    expect(transport.sent[0]).toEqual({
      type: 'registerClient',
      client: {
        id: 'browser-01',
        name: 'Browser Client',
        tools: [],
        prompts: [],
        skills: [
          {
            name: 'workspace/review',
            description: 'Review the workspace root.',
            contentType: 'text/markdown'
          }
        ],
        resources: []
      }
    })
  })

  it('routes skill resolvers with typed query params and headers', async () => {
    const transport = new FakeTransport()
    const client = createMdpClient({
      serverUrl: 'ws://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      transport
    })

    client.exposeSkill(
      'workspace/review',
      async (query, headers) =>
        `# Workspace Review\n\nlimit=${query.limit}\nheader=${headers['x-enabled']}`
    )

    transport.emit({
      type: 'callClient',
      requestId: 'req-skill-01',
      clientId: 'browser-01',
      kind: 'skill',
      name: 'workspace/review',
      args: {
        query: {
          limit: 5
        },
        headers: {
          'x-enabled': false
        }
      }
    })

    await vi.waitFor(() => {
      expect(transport.sent).toEqual([
        {
          type: 'callClientResult',
          requestId: 'req-skill-01',
          ok: true,
          data: '# Workspace Review\n\nlimit=5\nheader=false'
        }
      ])
    })
  })

  it('bootstraps cookie auth before websocket connect when auth is provided', async () => {
    const transport = new FakeTransport()
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    const client = createMdpClient({
      serverUrl: 'wss://127.0.0.1:7070',
      client: {
        id: 'browser-01',
        name: 'Browser Client'
      },
      auth: {
        token: 'client-token'
      },
      transportAuth: {
        mode: 'cookie',
        fetch
      },
      transport
    })

    await client.connect()

    expect(fetch).toHaveBeenCalledWith(
      'https://127.0.0.1:7070/mdp/auth',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          auth: {
            token: 'client-token'
          }
        })
      })
    )
    expect(transport.connect).toHaveBeenCalledOnce()
  })

  it('bootstraps websocket cookie auth by default without extra transport config', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    const connectSpy = vi.fn()

    try {
      vi.stubGlobal('fetch', fetch)
      vi.stubGlobal(
        'WebSocket',
        class FakeWebSocket {
          readyState = 0
          private listeners = new Map<string, Array<(event?: Event) => void>>()

          constructor(_url: string) {
            queueMicrotask(() => {
              this.readyState = 1
              connectSpy()
              this.emit('open')
            })
          }

          addEventListener(
            type: string,
            listener: (event?: Event) => void
          ): void {
            this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
          }

          close(): void {
            this.readyState = 3
            this.emit('close')
          }

          send(): void {}

          private emit(type: string): void {
            for (const listener of this.listeners.get(type) ?? []) {
              listener()
            }
          }
        }
      )

      const client = createMdpClient({
        serverUrl: 'ws://127.0.0.1:7070',
        client: {
          id: 'browser-01',
          name: 'Browser Client'
        },
        auth: {
          token: 'client-token'
        }
      })

      await client.connect()

      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:7070/mdp/auth',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            auth: {
              token: 'client-token'
            }
          })
        })
      )
      expect(connectSpy).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

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

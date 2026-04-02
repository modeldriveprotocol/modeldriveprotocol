import { describe, expect, it, vi } from 'vitest'

import type { ClientSession } from '../src/client-session.js'
import { InvocationRouter } from '../src/invocation-router.js'

describe('InvocationRouter', () => {
  it('sends routed invocations and resolves matching results', async () => {
    const session = {
      send: vi.fn()
    } as unknown as ClientSession
    const router = new InvocationRouter(() => session, 1_000)

    const invocation = router.invoke({
      clientId: 'client-01',
      type: 'endpoint',
      method: 'GET',
      path: '/search',
      params: {
        section: 'docs'
      },
      query: {
        q: 'mdp'
      },
      body: {
        includeMeta: true
      },
      headers: {
        'x-trace-id': 'trace-01'
      },
      auth: {
        token: 'host-token'
      }
    })

    const outboundMessage = vi.mocked(session.send).mock.calls[0]?.[0] as {
      requestId: string
      auth?: {
        token?: string
      }
    }

    expect(outboundMessage).toEqual({
      type: 'callClient',
      requestId: expect.any(String),
      clientId: 'client-01',
      method: 'GET',
      path: '/search',
      params: {
        section: 'docs'
      },
      query: {
        q: 'mdp'
      },
      body: {
        includeMeta: true
      },
      headers: {
        'x-trace-id': 'trace-01'
      },
      auth: {
        token: 'host-token'
      }
    })

    const resolved = router.resolve({
      type: 'callClientResult',
      requestId: outboundMessage.requestId,
      ok: true,
      data: {
        matches: 3
      }
    })

    expect(resolved).toBe(true)
    await expect(invocation).resolves.toEqual({
      type: 'callClientResult',
      requestId: outboundMessage.requestId,
      ok: true,
      data: {
        matches: 3
      }
    })
  })

  it('rejects dispatch when the client is not connected', () => {
    const router = new InvocationRouter(() => undefined, 1_000)

    expect(() =>
      router.invoke({
        clientId: 'client-01',
        type: 'endpoint',
        method: 'GET',
        path: '/missing',
        params: {}
      })
    ).toThrow('Client "client-01" is not connected')
  })

  it('times out pending invocations', async () => {
    vi.useFakeTimers()

    try {
      const session = {
        send: vi.fn()
      } as unknown as ClientSession
      const router = new InvocationRouter(() => session, 50)

      const invocation = router.invoke({
        clientId: 'client-01',
        type: 'endpoint',
        method: 'GET',
        path: '/search',
        params: {}
      })
      const rejection = expect(invocation).rejects.toThrow(
        'Invocation timed out for client "client-01"'
      )

      await vi.advanceTimersByTimeAsync(51)

      await rejection
    } finally {
      vi.useRealTimers()
    }
  })
})

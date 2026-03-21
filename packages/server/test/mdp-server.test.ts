import { describe, expect, it, vi } from 'vitest'

import type { ClientSessionTransport } from '../src/client-session.js'
import { MdpServerRuntime } from '../src/mdp-server.js'

function createTransport(
  overrides: Partial<ClientSessionTransport> = {}
): ClientSessionTransport {
  return {
    send: vi.fn(),
    close: vi.fn(),
    isOpen: vi.fn(() => true),
    mode: 'ws',
    secure: false,
    auth: undefined,
    ...overrides
  }
}

function createDescriptor(name = 'Browser Client') {
  return {
    id: 'client-01',
    name,
    tools: [{ name: 'searchDom' }],
    prompts: [],
    skills: [],
    resources: []
  }
}

describe('MdpServerRuntime', () => {
  it('registers clients and lists them through the capability index', () => {
    const runtime = new MdpServerRuntime()
    const session = runtime.createSession('conn-01', createTransport())

    runtime.handleMessage(session, {
      type: 'registerClient',
      client: createDescriptor()
    })

    expect(runtime.listClients()).toEqual([
      expect.objectContaining({
        id: 'client-01',
        name: 'Browser Client',
        status: 'online',
        connection: {
          mode: 'ws',
          secure: false,
          authSource: 'none'
        }
      })
    ])
  })

  it('replaces older sessions when a client re-registers with the same id', () => {
    const runtime = new MdpServerRuntime()
    const firstTransport = createTransport()
    const secondTransport = createTransport()
    const firstSession = runtime.createSession('conn-01', firstTransport)
    const secondSession = runtime.createSession('conn-02', secondTransport)

    runtime.handleMessage(firstSession, {
      type: 'registerClient',
      client: createDescriptor('Older Client')
    })
    runtime.handleMessage(secondSession, {
      type: 'registerClient',
      client: createDescriptor('Newer Client')
    })

    expect(vi.mocked(firstTransport.close)).toHaveBeenCalledWith(
      4000,
      'Replaced by newer client session'
    )
    expect(runtime.listClients()).toEqual([
      expect.objectContaining({
        id: 'client-01',
        name: 'Newer Client'
      })
    ])
  })

  it('unregisters the active client session', () => {
    const runtime = new MdpServerRuntime()
    const session = runtime.createSession('conn-01', createTransport())

    runtime.handleMessage(session, {
      type: 'registerClient',
      client: createDescriptor()
    })
    runtime.handleMessage(session, {
      type: 'unregisterClient',
      clientId: 'client-01'
    })

    expect(runtime.listClients()).toEqual([])
  })

  it('disconnects sessions that stop responding to heartbeats', async () => {
    vi.useFakeTimers()

    const runtime = new MdpServerRuntime({
      heartbeatIntervalMs: 10,
      heartbeatTimeoutMs: 15
    })
    const transport = createTransport()
    const session = runtime.createSession('conn-01', transport)

    try {
      runtime.handleMessage(session, {
        type: 'registerClient',
        client: createDescriptor()
      })
      runtime.startHeartbeat()

      await vi.advanceTimersByTimeAsync(20)

      expect(vi.mocked(transport.send)).toHaveBeenCalledTimes(1)
      expect(runtime.listClients()).toEqual([])
    } finally {
      await runtime.close()
      vi.useRealTimers()
    }
  })

  it('tracks auth sources and invokes authorization hooks', async () => {
    const authorizeRegistration = vi.fn()
    const authorizeInvocation = vi.fn()
    const runtime = new MdpServerRuntime({
      authorizeRegistration,
      authorizeInvocation
    })
    const transport = createTransport({
      auth: {
        token: 'transport-token'
      }
    })
    const session = runtime.createSession('conn-01', transport)

    runtime.handleMessage(session, {
      type: 'registerClient',
      client: createDescriptor(),
      auth: {
        token: 'message-token'
      }
    })

    expect(authorizeRegistration).toHaveBeenCalledWith({
      session,
      client: createDescriptor(),
      auth: {
        token: 'message-token'
      },
      transportAuth: {
        token: 'transport-token'
      }
    })
    expect(runtime.listClients()).toEqual([
      expect.objectContaining({
        id: 'client-01',
        connection: {
          mode: 'ws',
          secure: false,
          authSource: 'transport+message'
        }
      })
    ])

    const invocation = runtime.invoke({
      clientId: 'client-01',
      kind: 'tool',
      name: 'searchDom',
      auth: {
        token: 'host-token'
      }
    })
    const outbound = vi.mocked(transport.send).mock.calls[0]?.[0] as {
      requestId: string
    }

    runtime.handleMessage(session, {
      type: 'callClientResult',
      requestId: outbound.requestId,
      ok: true,
      data: {
        matches: 3
      }
    })

    await expect(invocation).resolves.toEqual({
      type: 'callClientResult',
      requestId: outbound.requestId,
      ok: true,
      data: {
        matches: 3
      }
    })
    expect(authorizeInvocation).toHaveBeenCalledWith({
      clientId: 'client-01',
      kind: 'tool',
      name: 'searchDom',
      auth: {
        token: 'host-token'
      },
      session,
      registeredAuth: {
        token: 'message-token'
      },
      transportAuth: {
        token: 'transport-token'
      }
    })
  })
})

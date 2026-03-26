import { describe, expect, it, vi } from 'vitest'

import type { ClientSessionTransport } from '../src/client-session.js'
import { MdpServerRuntime } from '../src/mdp-server.js'

const SEARCH_PATH = '/search'
const PROMPT_PATH = '/summarize-selection/prompt.md'
const SKILL_PATH = '/workspace/review/skill.md'
const INFO_PATH = '/workspace/info'

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

function createDescriptor(
  name = 'Browser Client',
  id = 'client-01',
  paths = [
    {
      type: 'endpoint' as const,
      path: SEARCH_PATH,
      method: 'GET' as const
    }
  ]
) {
  return {
    id,
    name,
    paths
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
        paths: [
          {
            type: 'endpoint',
            path: SEARCH_PATH,
            method: 'GET'
          }
        ],
        connection: {
          mode: 'ws',
          secure: false,
          authSource: 'none'
        }
      })
    ])
    expect(runtime.listClients({ search: 'browser' })).toEqual([
      expect.objectContaining({
        id: 'client-01',
        name: 'Browser Client'
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

  it('updates registered path catalogs in place', () => {
    const onClientRegistered = vi.fn()
    const runtime = new MdpServerRuntime({
      onClientRegistered
    })
    const session = runtime.createSession('conn-01', createTransport())
    const updatedPaths = [
      {
        type: 'endpoint' as const,
        path: SEARCH_PATH,
        method: 'GET' as const
      },
      {
        type: 'prompt' as const,
        path: PROMPT_PATH
      },
      {
        type: 'skill' as const,
        path: SKILL_PATH,
        contentType: 'text/markdown'
      },
      {
        type: 'endpoint' as const,
        path: INFO_PATH,
        method: 'GET' as const
      }
    ]

    runtime.handleMessage(session, {
      type: 'registerClient',
      client: createDescriptor()
    })
    runtime.handleMessage(session, {
      type: 'updateClientCatalog',
      clientId: 'client-01',
      paths: updatedPaths
    })

    expect(runtime.listClients()).toEqual([
      expect.objectContaining({
        id: 'client-01',
        paths: updatedPaths
      })
    ])
    expect(onClientRegistered).toHaveBeenLastCalledWith(
      expect.objectContaining({
        session,
        client: expect.objectContaining({
          id: 'client-01',
          paths: updatedPaths
        })
      })
    )
  })

  it('rejects path catalog updates from a different logical client id', () => {
    const runtime = new MdpServerRuntime()
    const session = runtime.createSession('conn-01', createTransport())

    runtime.handleMessage(session, {
      type: 'registerClient',
      client: createDescriptor()
    })

    expect(() =>
      runtime.handleMessage(session, {
        type: 'updateClientCatalog',
        clientId: 'client-02',
        paths: []
      })
    ).toThrow('Client "client-02" is not registered on this session')
  })

  it('treats re-registering with a new client id as removing the old registration', async () => {
    const onClientRemoved = vi.fn()
    const runtime = new MdpServerRuntime({
      onClientRemoved
    })
    const transport = createTransport()
    const session = runtime.createSession('conn-01', transport)

    runtime.handleMessage(session, {
      type: 'registerClient',
      client: createDescriptor('First Client', 'client-01')
    })

    const invocation = runtime.invoke({
      clientId: 'client-01',
      method: 'GET',
      path: SEARCH_PATH
    })

    runtime.handleMessage(session, {
      type: 'registerClient',
      client: createDescriptor('Second Client', 'client-02')
    })

    await expect(invocation).rejects.toThrow(
      'Client "client-01" was re-registered as "client-02"'
    )
    expect(runtime.listClients()).toEqual([
      expect.objectContaining({
        id: 'client-02',
        name: 'Second Client'
      })
    ])
    expect(onClientRemoved).toHaveBeenCalledWith(
      expect.objectContaining({
        session,
        client: expect.objectContaining({
          id: 'client-01',
          name: 'First Client'
        }),
        reason: 'unregister'
      })
    )
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
      method: 'GET',
      path: SEARCH_PATH,
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
      type: 'endpoint',
      method: 'GET',
      path: SEARCH_PATH,
      params: {},
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

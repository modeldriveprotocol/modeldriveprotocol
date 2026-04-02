import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ClientSessionTransport } from '../src/client-session.js'
import { MdpServerRuntime } from '../src/mdp-server.js'
import { MdpTransportServer } from '../src/transport-server.js'
import { discoverUpstreamMdpServer, probeMdpServer } from '../src/upstream-discovery.js'
import { MdpUpstreamProxy } from '../src/upstream-proxy.js'

const SEARCH_PATH = '/search'

const servers: MdpTransportServer[] = []

afterEach(async () => {
  await Promise.allSettled(servers.splice(0).map((server) => server.stop()))
})

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

function createDescriptor() {
  return {
    id: 'client-01',
    name: 'Browser Client',
    paths: [
      {
        type: 'endpoint' as const,
        path: SEARCH_PATH,
        method: 'GET' as const
      }
    ]
  }
}

function createMetaResponse(overrides: Partial<{
  protocolVersion: string
  supportedProtocolRanges: string[]
  serverId: string
  endpoints: {
    ws: string
    httpLoop: string
    auth: string
    meta: string
    cluster: string
  }
  cluster: {
    id: string
    membershipMode: 'dynamic' | 'static'
    membershipFingerprint: string
    role: 'leader' | 'follower' | 'candidate'
    term: number
    leaderId?: string
    leaderUrl?: string
    leaseDurationMs: number
  }
}> = {}): Response {
  return new Response(JSON.stringify({
    protocol: 'mdp',
    protocolVersion: overrides.protocolVersion ?? '1.0.0',
    supportedProtocolRanges: overrides.supportedProtocolRanges ?? ['^1.0.0'],
    serverId: overrides.serverId ?? 'hub',
    endpoints: overrides.endpoints ?? {
      ws: 'ws://127.0.0.1:47372',
      httpLoop: 'http://127.0.0.1:47372/mdp/http-loop',
      auth: 'http://127.0.0.1:47372/mdp/auth',
      meta: 'http://127.0.0.1:47372/mdp/meta',
      cluster: 'ws://127.0.0.1:47372/mdp/cluster'
    },
    features: {
      upstreamProxy: true,
      clusterControl: true
    },
    cluster: overrides.cluster ?? {
      id: 'cluster-local',
      membershipMode: 'dynamic',
      membershipFingerprint: 'dynamic',
      role: 'leader',
      term: 2,
      leaderId: overrides.serverId ?? 'hub',
      leaderUrl: 'ws://127.0.0.1:47372',
      leaseDurationMs: 4000
    }
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json'
    }
  })
}

describe('upstream discovery and proxying', () => {
  it('probes and discovers upstream MDP servers through the metadata endpoint', async () => {
    const runtime = new MdpServerRuntime()
    const server = new MdpTransportServer(runtime, {
      host: '127.0.0.1',
      port: 0,
      serverId: 'hub'
    })
    servers.push(server)
    await server.start()

    const port = server.address.port

    await expect(probeMdpServer(server.endpoints.ws)).resolves.toEqual(
      expect.objectContaining({
        url: server.endpoints.ws,
        meta: expect.objectContaining({
          protocol: 'mdp',
          serverId: 'hub',
          cluster: expect.objectContaining({
            role: 'leader',
            term: 0
          })
        })
      })
    )

    await expect(
      discoverUpstreamMdpServer({
        host: '127.0.0.1',
        startPort: port,
        attempts: 1
      })
    ).resolves.toEqual(
      expect.objectContaining({
        url: server.endpoints.ws,
        meta: expect.objectContaining({
          serverId: 'hub'
        })
      })
    )
  })

  it('keeps the probed upstream URL when metadata reports wildcard listen addresses', async () => {
    const fetch = vi.fn(async () => createMetaResponse({
      endpoints: {
        ws: 'ws://0.0.0.0:47372',
        httpLoop: 'http://0.0.0.0:47372/mdp/http-loop',
        auth: 'http://0.0.0.0:47372/mdp/auth',
        meta: 'http://0.0.0.0:47372/mdp/meta',
        cluster: 'ws://0.0.0.0:47372/mdp/cluster'
      }
    }))

    await expect(probeMdpServer('ws://127.0.0.1:47372', {
      fetch
    })).resolves.toEqual(
      expect.objectContaining({
        url: 'ws://127.0.0.1:47372',
        meta: expect.objectContaining({
          serverId: 'hub',
          endpoints: expect.objectContaining({
            cluster: 'ws://127.0.0.1:47372/mdp/cluster'
          })
        })
      })
    )
  })

  it('accepts upstream servers whose semver ranges satisfy the required protocol version', async () => {
    const fetch = vi.fn(async () => createMetaResponse({
      protocolVersion: '1.0.2',
      supportedProtocolRanges: ['^1.0.0']
    }))

    await expect(probeMdpServer('ws://127.0.0.1:47372', {
      fetch,
      requiredProtocolVersion: '1.0.5'
    })).resolves.toEqual(
      expect.objectContaining({
        url: 'ws://127.0.0.1:47372',
        meta: expect.objectContaining({
          serverId: 'hub',
          supportedProtocolRanges: ['^1.0.0']
        })
      })
    )
  })

  it('rejects an explicit upstream server from a different cluster id', async () => {
    const fetch = vi.fn(async () => createMetaResponse({
      cluster: {
        id: 'cluster-b',
        membershipMode: 'dynamic',
        membershipFingerprint: 'dynamic',
        role: 'leader',
        term: 2,
        leaderId: 'hub',
        leaderUrl: 'ws://127.0.0.1:47372',
        leaseDurationMs: 4000
      }
    }))

    await expect(probeMdpServer('ws://127.0.0.1:47372', {
      fetch,
      requiredClusterId: 'cluster-a'
    })).rejects.toThrow(
      'MDP server at ws://127.0.0.1:47372 belongs to cluster cluster-b, expected cluster-a.'
    )
  })

  it('rejects upstream servers that do not advertise a compatible protocol version', async () => {
    const fetch = vi.fn(async () => createMetaResponse({
      protocolVersion: '0.0.9',
      supportedProtocolRanges: ['^0.0.9']
    }))

    await expect(probeMdpServer('ws://127.0.0.1:47372', {
      fetch
    })).rejects.toThrow(
      'MDP server at ws://127.0.0.1:47372 does not support protocol version 1.0.0.'
    )
  })

  it('prefers the elected leader when discovery finds multiple servers', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof URL ? input.toString() : String(input)
      if (url.includes(':47372')) {
        return createMetaResponse({
          serverId: 'follower',
          cluster: {
            role: 'follower',
            id: 'cluster-local',
            membershipMode: 'dynamic',
            membershipFingerprint: 'dynamic',
            term: 5,
            leaderId: 'leader',
            leaderUrl: 'ws://127.0.0.1:47373',
            leaseDurationMs: 4000
          }
        })
      }

      if (url.includes(':47373')) {
        return createMetaResponse({
          serverId: 'leader',
          endpoints: {
            ws: 'ws://127.0.0.1:47373',
            httpLoop: 'http://127.0.0.1:47373/mdp/http-loop',
            auth: 'http://127.0.0.1:47373/mdp/auth',
            meta: 'http://127.0.0.1:47373/mdp/meta',
            cluster: 'ws://127.0.0.1:47373/mdp/cluster'
          },
          cluster: {
            role: 'leader',
            id: 'cluster-local',
            membershipMode: 'dynamic',
            membershipFingerprint: 'dynamic',
            term: 5,
            leaderId: 'leader',
            leaderUrl: 'ws://127.0.0.1:47373',
            leaseDurationMs: 4000
          }
        })
      }

      return new Response('', { status: 404 })
    })

    await expect(discoverUpstreamMdpServer({
      host: '127.0.0.1',
      startPort: 47372,
      attempts: 2,
      fetch
    })).resolves.toEqual(
      expect.objectContaining({
        url: 'ws://127.0.0.1:47373',
        meta: expect.objectContaining({
          serverId: 'leader',
          cluster: expect.objectContaining({
            role: 'leader'
          })
        })
      })
    )
  })

  it('ignores discovered peers from a different cluster id', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof URL ? input.toString() : String(input)
      if (url.includes(':47372')) {
        return createMetaResponse({
          serverId: 'cluster-a-leader',
          cluster: {
            id: 'cluster-a',
            membershipMode: 'dynamic',
            membershipFingerprint: 'dynamic',
            role: 'leader',
            term: 5,
            leaderId: 'cluster-a-leader',
            leaderUrl: 'ws://127.0.0.1:47372',
            leaseDurationMs: 4000
          }
        })
      }

      if (url.includes(':47373')) {
        return createMetaResponse({
          serverId: 'cluster-b-leader',
          endpoints: {
            ws: 'ws://127.0.0.1:47373',
            httpLoop: 'http://127.0.0.1:47373/mdp/http-loop',
            auth: 'http://127.0.0.1:47373/mdp/auth',
            meta: 'http://127.0.0.1:47373/mdp/meta',
            cluster: 'ws://127.0.0.1:47373/mdp/cluster'
          },
          cluster: {
            id: 'cluster-b',
            membershipMode: 'dynamic',
            membershipFingerprint: 'dynamic',
            role: 'leader',
            term: 8,
            leaderId: 'cluster-b-leader',
            leaderUrl: 'ws://127.0.0.1:47373',
            leaseDurationMs: 4000
          }
        })
      }

      return new Response('', { status: 404 })
    })

    await expect(discoverUpstreamMdpServer({
      host: '127.0.0.1',
      startPort: 47372,
      attempts: 2,
      fetch,
      requiredClusterId: 'cluster-a'
    })).resolves.toEqual(
      expect.objectContaining({
        url: 'ws://127.0.0.1:47372',
        meta: expect.objectContaining({
          serverId: 'cluster-a-leader',
          cluster: expect.objectContaining({
            id: 'cluster-a',
            role: 'leader'
          })
        })
      })
    )
  })

  it('mirrors local clients to an upstream server and forwards invocations', async () => {
    const upstreamRuntime = new MdpServerRuntime()
    const upstreamServer = new MdpTransportServer(upstreamRuntime, {
      host: '127.0.0.1',
      port: 0,
      serverId: 'hub'
    })
    servers.push(upstreamServer)
    await upstreamServer.start()

    let upstreamProxy: MdpUpstreamProxy | undefined
    const localRuntime = new MdpServerRuntime({
      onClientRegistered: ({ client }) => {
        void upstreamProxy?.syncClient(client)
      },
      onClientRemoved: ({ client }) => {
        void upstreamProxy?.removeClient(client.id)
      }
    })

    upstreamProxy = new MdpUpstreamProxy({
      runtime: localRuntime,
      upstreamUrl: upstreamServer.endpoints.ws,
      serverId: 'edge-01'
    })

    const transport = createTransport()
    const session = localRuntime.createSession('conn-01', transport)
    const descriptor = createDescriptor()
    const mirroredClientId = upstreamProxy.getMirroredClientId(descriptor.id)

    localRuntime.handleMessage(session, {
      type: 'registerClient',
      client: descriptor
    })

    await eventually(() => {
      expect(upstreamRuntime.listClients()).toEqual([
        expect.objectContaining({
          id: mirroredClientId,
          name: 'Browser Client'
        })
      ])
    })

    const invocation = upstreamRuntime.invoke({
      clientId: mirroredClientId,
      method: 'GET',
      path: SEARCH_PATH,
      auth: {
        token: 'host-token'
      }
    })

    const outbound = await eventually(() => {
      const call = vi.mocked(transport.send).mock.calls.find(
        ([message]) => message.type === 'callClient'
      )?.[0]

      expect(call).toEqual(
        expect.objectContaining({
          type: 'callClient',
          clientId: descriptor.id,
          method: 'GET',
          path: SEARCH_PATH,
          auth: {
            token: 'host-token'
          }
        })
      )

      return call as {
        requestId: string
      }
    })

    localRuntime.handleMessage(session, {
      type: 'callClientResult',
      requestId: outbound.requestId,
      ok: true,
      data: {
        matches: 3
      }
    })

    await expect(invocation).resolves.toEqual(
      expect.objectContaining({
        type: 'callClientResult',
        ok: true,
        data: {
          matches: 3
        }
      })
    )

    localRuntime.handleMessage(session, {
      type: 'unregisterClient',
      clientId: descriptor.id
    })

    await eventually(() => {
      expect(upstreamRuntime.listClients()).toEqual([])
    })

    await upstreamProxy.close()
  })
})

async function eventually<T>(assertion: () => T | Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return await assertion()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => {
        setTimeout(resolve, 25)
      })
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Condition was not met in time')
}

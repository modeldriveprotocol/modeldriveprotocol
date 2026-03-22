import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ClientSessionTransport } from '../src/client-session.js'
import { MdpServerRuntime } from '../src/mdp-server.js'
import { MdpTransportServer } from '../src/transport-server.js'
import { discoverUpstreamMdpServer, probeMdpServer } from '../src/upstream-discovery.js'
import { MdpUpstreamProxy } from '../src/upstream-proxy.js'

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
    tools: [{ name: 'searchDom' }],
    prompts: [],
    skills: [],
    resources: []
  }
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
          serverId: 'hub'
        })
      })
    )

    await expect(
      discoverUpstreamMdpServer({
        host: '127.0.0.1',
        startPort: port - 1,
        attempts: 2
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

  it('keeps the probed upstream URL when metadata reports a wildcard listen address', async () => {
    const fetch = vi.fn(async () => {
      return new Response(JSON.stringify({
        protocol: 'mdp',
        protocolVersion: '0.1.0',
        supportedProtocolRanges: ['^0.1.0'],
        serverId: 'hub',
        endpoints: {
          ws: 'ws://0.0.0.0:47372',
          httpLoop: 'http://0.0.0.0:47372/mdp/http-loop',
          auth: 'http://0.0.0.0:47372/mdp/auth',
          meta: 'http://0.0.0.0:47372/mdp/meta'
        },
        features: {
          upstreamProxy: true
        }
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json'
        }
      })
    })

    await expect(probeMdpServer('ws://127.0.0.1:47372', {
      fetch
    })).resolves.toEqual(
      expect.objectContaining({
        url: 'ws://127.0.0.1:47372',
        meta: expect.objectContaining({
          serverId: 'hub'
        })
      })
    )
  })

  it('accepts upstream servers whose semver ranges satisfy the required protocol version', async () => {
    const fetch = vi.fn(async () => {
      return new Response(JSON.stringify({
        protocol: 'mdp',
        protocolVersion: '0.1.2',
        supportedProtocolRanges: ['^0.1.0'],
        serverId: 'hub',
        endpoints: {
          ws: 'ws://127.0.0.1:47372',
          httpLoop: 'http://127.0.0.1:47372/mdp/http-loop',
          auth: 'http://127.0.0.1:47372/mdp/auth',
          meta: 'http://127.0.0.1:47372/mdp/meta'
        },
        features: {
          upstreamProxy: true
        }
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json'
        }
      })
    })

    await expect(probeMdpServer('ws://127.0.0.1:47372', {
      fetch,
      requiredProtocolVersion: '0.1.5'
    })).resolves.toEqual(
      expect.objectContaining({
        url: 'ws://127.0.0.1:47372',
        meta: expect.objectContaining({
          serverId: 'hub',
          supportedProtocolRanges: ['^0.1.0']
        })
      })
    )
  })

  it('rejects upstream servers that do not advertise a compatible protocol version', async () => {
    const fetch = vi.fn(async () => {
      return new Response(JSON.stringify({
        protocol: 'mdp',
        protocolVersion: '0.0.9',
        supportedProtocolRanges: ['^0.0.9'],
        serverId: 'hub',
        endpoints: {
          ws: 'ws://127.0.0.1:47372',
          httpLoop: 'http://127.0.0.1:47372/mdp/http-loop',
          auth: 'http://127.0.0.1:47372/mdp/auth',
          meta: 'http://127.0.0.1:47372/mdp/meta'
        },
        features: {
          upstreamProxy: true
        }
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json'
        }
      })
    })

    await expect(probeMdpServer('ws://127.0.0.1:47372', {
      fetch
    })).rejects.toThrow(
      'MDP server at ws://127.0.0.1:47372 does not support protocol version 0.1.0.'
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
      kind: 'tool',
      name: 'searchDom',
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
          kind: 'tool',
          name: 'searchDom',
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

  it('promotes the local server when the upstream connection is lost', async () => {
    const upstreamRuntime = new MdpServerRuntime()
    const upstreamServer = new MdpTransportServer(upstreamRuntime, {
      host: '127.0.0.1',
      port: 0,
      serverId: 'hub'
    })
    servers.push(upstreamServer)
    await upstreamServer.start()

    const onUpstreamUnavailable = vi.fn()
    const localRuntime = new MdpServerRuntime()
    const upstreamProxy = new MdpUpstreamProxy({
      runtime: localRuntime,
      upstreamUrl: upstreamServer.endpoints.ws,
      serverId: 'edge-01',
      onUpstreamUnavailable
    })
    await upstreamProxy.start()

    const transport = createTransport()
    const session = localRuntime.createSession('conn-01', transport)
    const descriptor = createDescriptor()

    localRuntime.handleMessage(session, {
      type: 'registerClient',
      client: descriptor
    })

    await upstreamProxy.syncClient(descriptor)
    await upstreamServer.stop()

    await eventually(() => {
      expect(onUpstreamUnavailable).toHaveBeenCalledWith(
        expect.objectContaining({
          upstreamUrl: expect.stringContaining('ws://127.0.0.1:')
        })
      )
    })

    await expect(upstreamProxy.syncClient({
      ...descriptor,
      id: 'client-02'
    })).resolves.toBeUndefined()
  })

  it('detects upstream loss even when no mirrored clients are connected', async () => {
    const upstreamRuntime = new MdpServerRuntime()
    const upstreamServer = new MdpTransportServer(upstreamRuntime, {
      host: '127.0.0.1',
      port: 0,
      serverId: 'hub'
    })
    servers.push(upstreamServer)
    await upstreamServer.start()

    const onUpstreamUnavailable = vi.fn()
    const upstreamProxy = new MdpUpstreamProxy({
      runtime: new MdpServerRuntime(),
      upstreamUrl: upstreamServer.endpoints.ws,
      serverId: 'edge-01',
      onUpstreamUnavailable
    })

    await upstreamProxy.start()
    await upstreamServer.stop()

    await eventually(() => {
      expect(onUpstreamUnavailable).toHaveBeenCalledOnce()
    })
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

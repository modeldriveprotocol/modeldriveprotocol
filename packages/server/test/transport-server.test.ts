import { afterEach, describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'

import { MdpServerRuntime } from '../src/mdp-server.js'
import { MdpTransportServer } from '../src/transport-server.js'

const SEARCH_PATH = '/search'
const SKILL_PATH = '/docs/root/child/skill.md'

const TEST_TLS_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDEXsJqTUr4qlZi
bEkvsEKwdSEZsA9kZBkkbgf4ylqAeeDA7wlfKctaCgbpni6SVHO02pHDqi1WTV8H
GuCrdnTeQmtA9VhYN5ag4HBKRwFiWl23jE6bmhdUucVo3hu3moCGqKWIlAR3YrBW
g1ejJdo2hY972aNZ8sQiAHVwicAMXqsdyDF9ARzAhZqn5dPzjEZoB6KpNgAJ1QZy
06Iq7LK+sHPA7mLYAr5Vb1+iDs+Igk1vGaVExMqV2TH6e7gTrniM2NMDhbpdBbgJ
UBojzXSgDAd3ap5f8nElLxbL66VD5rVWxosUXBRAdPa0+PT2MBrbV5L/Q39+0IbK
O7StzDSLAgMBAAECggEACnBZW+GFGqZNPYWGlD1pQbcISm2gHoMYm4Ip5ho1fheY
+2UWFazgGfh1YA8HL23D34s+gnQrXXzIkFUgqmPfHz9fFq7QpgRWe3HEtJqTQphx
MPJe0S00ZWqE9Fmgh8wCCN9q5VF0mRrHY+H1/el//yXDlJCqtAn0Faak0HlD8DKH
xhEUUf8Z4SfFoEAjDSQOPjdEcGN67PQkPZzspoXwurJ9UNtfriwHzukqC3Ihsq/h
Fsif1N3dHhKq3MbViHVHKMvWnUkS53cdpo23xY6mbqBY5d/84Yiggsuif2amqtrA
ShDGpVrUoy0CBxuRF/ZCS07A9ESPVC3irWd+lmfwiQKBgQDzwk8ezP6Ex5N6+xPW
/5mFrmP+Ig8b7Vk45Zfphrd+KGRaRTdoslEcdtkh/89jsy8LZyuMW3Ecq8F8Zic+
TSsokMFwst5tNVgx5Ke//JVBH1G5/WqPe9h915RGXvaMs6l6zqJWULbh/6sc32z3
MzKcmTFrLgTvnR8NRDSdu6Iy1QKBgQDOOzvTnmzjm0ItUxe/m8NYfAhgw0gfTAdz
pSr266dDH0ZCy4WO8GRwEec4Xy3fh8bNkmXPWno95J8wTyhW+yfXGlVECjdZ6tvG
oolNixDQ63zNHxRwQ59ELtaOqEtyksOQ5uLtVtNZ5lW2GPeLbVN/CpgEA59wlN2C
MpClmK653wKBgAntVuWNOaxUqGfww70Uyb7M/FuELZNYljKf/xDOoLhtkrCucvQ7
ltwO5wbgcSTBTmArgnWD39ZoFEgprN13rRNI2efqEO7npkDZ7A8AjV+Kk/x8GpPf
WlC9r9cx1N6kDnnm4mube+c2T1SssLZcimogPwf7Zs4PWw1iQrZNxuxFAoGBAL7b
+uZCPCv4yCoCOHxPv13ojChhEiJEzrCsLzMNrGJmUzQF/rjmqU0+hGqbS20Pz2D5
F9fquC8HonunBoJZNenQqRCrE8bXoEYYrlFhXlK7XWjIVrX/HyqO3mpwPkLuqKc1
xtY4AKm2jaRVPuN+bkOonj84yxn563ZPLabTwwCpAoGBAMeYEDlz9zwjRYIdwq1D
5I42C5g4TPjPAoS5vGnrutJhJml09HCdVJLCBrtt5YWjF/+/fSSU1nUZSc/Wpk4t
7iHqcDkNgRwFKR4U9sfArli7aaZoHppxKdZxd3nwMLqDFQUeTiMJM668tblvovoY
gyMpW2gXzhs/vyhwrpaA3YeK
-----END PRIVATE KEY-----`

const TEST_TLS_CERT = `-----BEGIN CERTIFICATE-----
MIIDCTCCAfGgAwIBAgIUBsyRh7Mzngm4UZdwAGjYzyJDOOgwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJMTI3LjAuMC4xMB4XDTI2MDMyMDA4MjkxOVoXDTI3MDMy
MDA4MjkxOVowFDESMBAGA1UEAwwJMTI3LjAuMC4xMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAxF7Cak1K+KpWYmxJL7BCsHUhGbAPZGQZJG4H+MpagHng
wO8JXynLWgoG6Z4uklRztNqRw6otVk1fBxrgq3Z03kJrQPVYWDeWoOBwSkcBYlpd
t4xOm5oXVLnFaN4bt5qAhqiliJQEd2KwVoNXoyXaNoWPe9mjWfLEIgB1cInADF6r
HcgxfQEcwIWap+XT84xGaAeiqTYACdUGctOiKuyyvrBzwO5i2AK+VW9fog7PiIJN
bxmlRMTKldkx+nu4E654jNjTA4W6XQW4CVAaI810oAwHd2qeX/JxJS8Wy+ulQ+a1
VsaLFFwUQHT2tPj09jAa21eS/0N/ftCGyju0rcw0iwIDAQABo1MwUTAdBgNVHQ4E
FgQU+ObIvAEDAbMUKh8RlRgV6wf/LFAwHwYDVR0jBBgwFoAU+ObIvAEDAbMUKh8R
lRgV6wf/LFAwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAqJ9N
kBhJMCLH9tDWipwAkiHoWXlCuAqzEPbgvKs8sFYgDgmKsK1GRCkPes+Vs9RxbAA0
rR8YCZNeyYGghMPVUzAb5V1MlNewW/b7A09VXsPYnims9dHXL2jDeoBqMd6blZtc
aVfZN8q/ZdzPir7oPrIka3VAaAJm7ZTifaC8rZBZPrM/NKoniAg0Rscn7MSVfEer
NmJyG95Pw/Ko+6cboxdHKteGO2ydjn36UBDddVKyTyFuu0itGHSRDr0Eji8F8WQA
zeqKOGcTcVPtgQ15a7BnEIou51Nh9e0rSjol1Ooxp9mtMXcJGKl0GeO4D/S7ldcM
5kHkt52o2WojwA4LAw==
-----END CERTIFICATE-----`

const registeredClient = {
  id: 'client-01',
  name: 'HTTP Loop Client',
  paths: [
    {
      type: 'endpoint' as const,
      path: SEARCH_PATH,
      method: 'GET' as const
    }
  ]
}

const servers: MdpTransportServer[] = []

afterEach(async () => {
  await Promise.allSettled(servers.splice(0).map((server) => server.stop()))
})

describe('MdpTransportServer', () => {
  it('exposes an MDP metadata probe endpoint', async () => {
    const runtime = new MdpServerRuntime()
    const server = new MdpTransportServer(runtime, {
      host: '127.0.0.1',
      port: 0,
      serverId: 'probe-server'
    })
    servers.push(server)
    await server.start()

    const response = await fetch(server.endpoints.meta)
    const payload = (await response.json()) as {
      protocol: string
      protocolVersion: string
      supportedProtocolRanges: string[]
      serverId: string
      endpoints: {
        ws: string
        meta: string
        cluster: string
      }
      features: {
        upstreamProxy: boolean
        clusterControl: boolean
      }
      cluster: {
        id: string
        membershipMode: string
        membershipFingerprint: string
        role: string
        term: number
        knownMemberCount?: number
        reachableMemberCount?: number
        quorumSize?: number
        hasQuorum?: boolean
      }
    }

    expect(response.status).toBe(200)
    expect(payload).toEqual(expect.objectContaining({
      protocol: 'mdp',
      protocolVersion: '1.0.0',
      supportedProtocolRanges: ['^1.0.0'],
      serverId: 'probe-server',
      endpoints: expect.objectContaining({
        ws: server.endpoints.ws,
        meta: server.endpoints.meta,
        cluster: server.endpoints.cluster
      }),
      features: {
        upstreamProxy: true,
        clusterControl: true
      },
      cluster: expect.objectContaining({
        id: expect.any(String),
        membershipMode: 'dynamic',
        membershipFingerprint: 'dynamic',
        role: 'leader',
        term: 0,
        knownMemberCount: 1,
        reachableMemberCount: 1,
        quorumSize: 1,
        hasQuorum: true
      })
    }))
  })

  it('refreshes HTTP loop auth from send and poll requests', async () => {
    const authorizeRegistration = vi.fn()
    const authorizeInvocation = vi.fn()
    const runtime = new MdpServerRuntime({
      authorizeRegistration,
      authorizeInvocation
    })
    const server = new MdpTransportServer(runtime, {
      host: '127.0.0.1',
      port: 0,
      longPollTimeoutMs: 50
    })
    servers.push(server)
    await server.start()

    const connectResponse = await fetch(`${server.endpoints.httpLoop}/connect`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: '{}'
    })
    const connectPayload = (await connectResponse.json()) as { sessionId: string }

    expect(connectPayload.sessionId).toBeTypeOf('string')

    await fetch(`${server.endpoints.httpLoop}/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-mdp-session-id': connectPayload.sessionId,
        authorization: 'Bearer register-token'
      },
      body: JSON.stringify({
        message: {
          type: 'registerClient',
          client: registeredClient,
          auth: {
            token: 'message-token'
          }
        }
      })
    })

    expect(authorizeRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        transportAuth: expect.objectContaining({
          token: 'register-token'
        })
      })
    )
    expect(runtime.listClients()).toEqual([
      expect.objectContaining({
        id: 'client-01',
        connection: {
          mode: 'http-loop',
          secure: false,
          authSource: 'transport+message'
        }
      })
    ])

    const idlePollResponse = await fetch(
      `${server.endpoints.httpLoop}/poll?sessionId=${connectPayload.sessionId}&waitMs=1`,
      {
        headers: {
          authorization: 'Bearer poll-token'
        }
      }
    )

    expect(idlePollResponse.status).toBe(204)

    const invocation = runtime.invoke({
      clientId: 'client-01',
      method: 'GET',
      path: SEARCH_PATH,
      auth: {
        token: 'host-token'
      }
    })
    expect(authorizeInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        transportAuth: expect.objectContaining({
          token: 'poll-token'
        })
      })
    )

    const pollResponse = await fetch(
      `${server.endpoints.httpLoop}/poll?sessionId=${connectPayload.sessionId}&waitMs=100`,
      {
        headers: {
          authorization: 'Bearer poll-token'
        }
      }
    )
    const pollPayload = (await pollResponse.json()) as {
      message: {
        requestId: string
        auth?: {
          token?: string
        }
      }
    }

    expect(pollPayload.message.auth).toEqual({
      token: 'host-token'
    })

    await fetch(`${server.endpoints.httpLoop}/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-mdp-session-id': connectPayload.sessionId
      },
      body: JSON.stringify({
        message: {
          type: 'callClientResult',
          requestId: pollPayload.message.requestId,
          ok: true,
          data: {
            matches: 3
          }
        }
      })
    })

    await expect(invocation).resolves.toEqual({
      type: 'callClientResult',
      requestId: pollPayload.message.requestId,
      ok: true,
      data: {
        matches: 3
      }
    })
  })

  it('answers CORS preflights for HTTP loop endpoints', async () => {
    const runtime = new MdpServerRuntime()
    const server = new MdpTransportServer(runtime, {
      host: '127.0.0.1',
      port: 0
    })
    servers.push(server)
    await server.start()

    const response = await fetch(`${server.endpoints.httpLoop}/connect`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://browser.example.test',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, x-mdp-session-id, authorization'
      }
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://browser.example.test'
    )
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
    expect(response.headers.get('access-control-allow-methods')).toBe(
      'GET, POST, OPTIONS'
    )
    expect(response.headers.get('access-control-allow-headers')).toBe(
      'content-type, x-mdp-session-id, authorization'
    )
  })

  it('accepts secure websocket clients over wss', async () => {
    const runtime = new MdpServerRuntime()
    const server = new MdpTransportServer(runtime, {
      host: '127.0.0.1',
      port: 0,
      tls: {
        key: TEST_TLS_KEY,
        cert: TEST_TLS_CERT
      }
    })
    servers.push(server)
    await server.start()

    const socket = new WebSocket(server.endpoints.ws, {
      rejectUnauthorized: false
    })

    await waitForOpen(socket)

    socket.send(
      JSON.stringify({
        type: 'registerClient',
        client: registeredClient
      })
    )

    await vi.waitFor(() => {
      expect(runtime.listClients()).toEqual([
        expect.objectContaining({
          id: 'client-01',
          connection: {
            mode: 'ws',
            secure: true,
            authSource: 'none'
          }
        })
      ])
    })

    socket.close()
    await waitForClose(socket)
  })

  it('issues auth cookies that websocket clients can reuse', async () => {
    const authorizeRegistration = vi.fn()
    const runtime = new MdpServerRuntime({
      authorizeRegistration
    })
    const server = new MdpTransportServer(runtime, {
      host: '127.0.0.1',
      port: 0
    })
    servers.push(server)
    await server.start()

    const authResponse = await fetch(server.endpoints.auth, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        auth: {
          scheme: 'Bearer',
          token: 'cookie-token',
          metadata: {
            source: 'auth-endpoint'
          }
        }
      })
    })
    const cookieHeader = readSetCookieHeader(authResponse)

    expect(authResponse.status).toBe(204)
    expect(cookieHeader).toContain('mdp_auth=')

    const socket = new WebSocket(server.endpoints.ws, {
      headers: {
        cookie: cookieHeader.split(';')[0] as string
      }
    })

    await waitForOpen(socket)

    socket.send(
      JSON.stringify({
        type: 'registerClient',
        client: registeredClient
      })
    )

    await vi.waitFor(() => {
      expect(authorizeRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          transportAuth: expect.objectContaining({
            scheme: 'Bearer',
            token: 'cookie-token',
            metadata: {
              source: 'auth-endpoint'
            }
          })
        })
      )
      expect(runtime.listClients()).toEqual([
        expect.objectContaining({
          id: 'client-01',
          connection: {
            mode: 'ws',
            secure: false,
            authSource: 'transport'
          }
        })
      ])
    })

    socket.close()
    await waitForClose(socket)
  })

  it('serves skill content over HTTP routes with query params and headers', async () => {
    const runtime = new MdpServerRuntime()
    const server = new MdpTransportServer(runtime, {
      host: '127.0.0.1',
      port: 0,
      longPollTimeoutMs: 50
    })
    servers.push(server)
    await server.start()

    const sessionId = await connectHttpLoopClient(server)
    await sendHttpLoopMessage(server, sessionId, {
      type: 'registerClient',
      client: {
        ...registeredClient,
        paths: [
          ...registeredClient.paths,
          {
            type: 'skill' as const,
            path: SKILL_PATH,
            description: 'Child skill',
            contentType: 'text/markdown'
          }
        ]
      }
    })

    const nestedRouteResponsePromise = fetch(
      `${server.endpoints.httpLoop.replace('/mdp/http-loop', '')}/client-01/skills/docs/root/child?a=1`,
      {
        headers: {
          'x-test-header': 'nested'
        }
      }
    )

    const nestedInvocation = await pollHttpLoopMessage(server, sessionId)

    expect(nestedInvocation).toEqual(
      expect.objectContaining({
        type: 'callClient',
        method: 'GET',
        path: SKILL_PATH,
        query: {
          a: '1'
        },
        headers: expect.objectContaining({
          'x-test-header': 'nested'
        })
      })
    )

    await sendHttpLoopMessage(server, sessionId, {
      type: 'callClientResult',
      requestId: nestedInvocation.requestId,
      ok: true,
      data: '# 子技能\n\n嵌套路由。'
    })

    const nestedRouteResponse = await nestedRouteResponsePromise

    expect(nestedRouteResponse.status).toBe(200)
    expect(nestedRouteResponse.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8'
    )
    await expect(nestedRouteResponse.text()).resolves.toBe(
      '# 子技能\n\n嵌套路由。'
    )

    const directRouteResponsePromise = fetch(
      `${server.endpoints.httpLoop.replace('/mdp/http-loop', '')}/skills/client-01/docs/root/child?topic=mdp`,
      {
        headers: {
          'x-test-header': 'direct'
        }
      }
    )

    const directInvocation = await pollHttpLoopMessage(server, sessionId)

    expect(directInvocation).toEqual(
      expect.objectContaining({
        type: 'callClient',
        method: 'GET',
        path: SKILL_PATH,
        query: {
          topic: 'mdp'
        },
        headers: expect.objectContaining({
          'x-test-header': 'direct'
        })
      })
    )

    await sendHttpLoopMessage(server, sessionId, {
      type: 'callClientResult',
      requestId: directInvocation.requestId,
      ok: true,
      data: '# 子技能\n\n直接路由。'
    })

    const directRouteResponse = await directRouteResponsePromise

    expect(directRouteResponse.status).toBe(200)
    expect(directRouteResponse.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8'
    )
    await expect(directRouteResponse.text()).resolves.toBe(
      '# 子技能\n\n直接路由。'
    )
  })
})

async function waitForOpen(socket: WebSocket): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve())
    socket.once('error', reject)
  })
}

async function waitForClose(socket: WebSocket): Promise<void> {
  await new Promise<void>((resolve) => {
    socket.once('close', () => resolve())
  })
}

function readSetCookieHeader(response: Response): string {
  const fromSpecializedAccessor = 'getSetCookie' in response.headers &&
      typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()[0]
    : undefined

  return fromSpecializedAccessor ?? response.headers.get('set-cookie') ?? ''
}

async function connectHttpLoopClient(server: MdpTransportServer): Promise<string> {
  const connectResponse = await fetch(`${server.endpoints.httpLoop}/connect`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: '{}'
  })
  const connectPayload = (await connectResponse.json()) as { sessionId: string }
  return connectPayload.sessionId
}

async function sendHttpLoopMessage(
  server: MdpTransportServer,
  sessionId: string,
  message: Record<string, unknown>
): Promise<void> {
  await fetch(`${server.endpoints.httpLoop}/send`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-mdp-session-id': sessionId
    },
    body: JSON.stringify({
      message
    })
  })
}

async function pollHttpLoopMessage(
  server: MdpTransportServer,
  sessionId: string
): Promise<{
  requestId: string
  type: 'callClient'
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  params?: Record<string, unknown>
  query?: Record<string, unknown>
  headers?: Record<string, string>
  auth?: {
    token?: string
  }
}> {
  const response = await fetch(
    `${server.endpoints.httpLoop}/poll?sessionId=${sessionId}&waitMs=100`
  )
  const payload = (await response.json()) as {
    message: {
      requestId: string
      type: 'callClient'
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      path: string
      params?: Record<string, unknown>
      query?: Record<string, unknown>
      headers?: Record<string, string>
      auth?: {
        token?: string
      }
    }
  }

  return payload.message
}

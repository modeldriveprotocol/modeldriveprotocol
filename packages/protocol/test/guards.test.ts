import { describe, expect, it } from 'vitest'

import {
  comparePathSpecificity,
  createSerializedError,
  isConcretePath,
  isPathPattern,
  isStringRecord,
  matchPathPattern,
  parseClusterMessage,
  parseMessage
} from '../src/index.js'

const clientDescriptor = {
  id: 'client-01',
  name: 'Protocol Test Client',
  paths: []
}

describe('protocol guards', () => {
  it('parses a valid registerClient message', () => {
    const message = parseMessage(
      JSON.stringify({
        type: 'registerClient',
        client: clientDescriptor,
        auth: {
          scheme: 'Bearer',
          token: 'client-token',
          headers: {
            authorization: 'Bearer client-token'
          }
        }
      })
    )

    expect(message).toEqual({
      type: 'registerClient',
      client: clientDescriptor,
      auth: {
        scheme: 'Bearer',
        token: 'client-token',
        headers: {
          authorization: 'Bearer client-token'
        }
      }
    })
  })

  it('preserves path metadata on descriptors', () => {
    const message = parseMessage(
      JSON.stringify({
        type: 'registerClient',
        client: {
          ...clientDescriptor,
          paths: [
            {
              type: 'endpoint',
              path: '/goods',
              method: 'GET',
              description: 'List goods',
              outputSchema: {
                type: 'object'
              }
            },
            {
              type: 'skill',
              path: '/goods/skill.md',
              description: 'Goods usage'
            }
          ]
        }
      })
    )

    expect(message).toEqual({
      type: 'registerClient',
      client: {
        ...clientDescriptor,
        paths: [
          {
            type: 'endpoint',
            path: '/goods',
            method: 'GET',
            description: 'List goods',
            outputSchema: {
              type: 'object'
            }
          },
          {
            type: 'skill',
            path: '/goods/skill.md',
            description: 'Goods usage'
          }
        ]
      }
    })
  })

  it('parses client catalog updates', () => {
    const message = parseMessage(
      JSON.stringify({
        type: 'updateClientCatalog',
        clientId: 'client-01',
        paths: [
          {
            type: 'prompt',
            path: '/goods/prompt.md',
            inputSchema: {
              type: 'object'
            }
          }
        ]
      })
    )

    expect(message).toEqual({
      type: 'updateClientCatalog',
      clientId: 'client-01',
      paths: [
        {
          type: 'prompt',
          path: '/goods/prompt.md',
          inputSchema: {
            type: 'object'
          }
        }
      ]
    })
  })

  it('rejects invalid path definitions and old capability update messages', () => {
    expect(() =>
      parseMessage(
        JSON.stringify({
          type: 'updateClientCapabilities',
          clientId: 'client-01',
          capabilities: {}
        })
      )
    ).toThrow('Invalid MDP message')

    expect(() =>
      parseMessage(
        JSON.stringify({
          type: 'registerClient',
          client: {
            ...clientDescriptor,
            paths: [
              {
                type: 'skill',
                path: '/goods/../skill.md'
              }
            ]
          }
        })
      )
    ).toThrow('Invalid MDP message')
  })

  it('validates descriptor paths and concrete call paths', () => {
    expect(isPathPattern('/goods')).toBe(true)
    expect(isPathPattern('/goods/:id')).toBe(true)
    expect(isPathPattern('/goods/skill.md')).toBe(true)
    expect(isPathPattern('/goods/SKILL.md')).toBe(true)
    expect(isPathPattern('/goods/PROMPT.md')).toBe(true)
    expect(isPathPattern('/goods/.ai/skills/SKILL.md')).toBe(true)
    expect(isPathPattern('goods')).toBe(false)
    expect(isPathPattern('/goods/:bad?')).toBe(false)
    expect(isPathPattern('/goods/prompt.md/extra')).toBe(false)

    expect(isConcretePath('/goods/123')).toBe(true)
    expect(isConcretePath('/goods/:id')).toBe(false)
    expect(isConcretePath('/goods/Prompt.md')).toBe(false)
    expect(isConcretePath('/goods/SKILL.md')).toBe(true)
    expect(isConcretePath('/goods/.ai/skills/SKILL.md')).toBe(true)
  })

  it('matches path params and prefers static routes over param routes', () => {
    expect(matchPathPattern('/goods/:id', '/goods/sku-01')).toEqual({
      params: {
        id: 'sku-01'
      },
      specificity: [2, 0]
    })
    expect(matchPathPattern('/goods/:id', '/orders/sku-01')).toBeUndefined()
    expect(comparePathSpecificity([2, 1], [2, 0])).toBeGreaterThan(0)
  })

  it('parses callClient auth envelopes and request payloads', () => {
    const message = parseMessage(
      JSON.stringify({
        type: 'callClient',
        requestId: 'req-03',
        clientId: 'client-01',
        method: 'GET',
        path: '/goods/sku-01',
        params: {
          id: 'sku-01'
        },
        query: {
          page: 1
        },
        headers: {
          'x-trace-id': 'trace-01'
        },
        auth: {
          token: 'host-token',
          metadata: {
            requestId: 'trace-01'
          }
        }
      })
    )

    expect(message).toEqual({
      type: 'callClient',
      requestId: 'req-03',
      clientId: 'client-01',
      method: 'GET',
      path: '/goods/sku-01',
      params: {
        id: 'sku-01'
      },
      query: {
        page: 1
      },
      headers: {
        'x-trace-id': 'trace-01'
      },
      auth: {
        token: 'host-token',
        metadata: {
          requestId: 'trace-01'
        }
      }
    })
  })

  it('accepts string records and preserves serialized error details', () => {
    const error = createSerializedError('bad_request', 'Invalid input', {
      field: 'query'
    })

    expect(error).toEqual({
      code: 'bad_request',
      message: 'Invalid input',
      details: {
        field: 'query'
      }
    })
    expect(isStringRecord({ host: '127.0.0.1', port: '7070' })).toBe(true)
    expect(isStringRecord({ host: '127.0.0.1', port: 7070 })).toBe(false)
  })

  it('parses cluster control messages', () => {
    const request = parseClusterMessage(
      JSON.stringify({
        type: 'clusterRpcRequest',
        clusterId: 'cluster-local',
        serverId: 'server-02',
        term: 2,
        requestId: 'rpc-00',
        method: 'callPath',
        params: {
          clientId: 'client-01',
          method: 'GET',
          path: '/echo'
        },
        timestamp: Date.now()
      })
    )

    expect(request).toEqual(expect.objectContaining({
      type: 'clusterRpcRequest',
      clusterId: 'cluster-local',
      serverId: 'server-02',
      requestId: 'rpc-00',
      method: 'callPath'
    }))

    const response = parseClusterMessage(
      JSON.stringify({
        type: 'clusterRpcResponse',
        clusterId: 'cluster-local',
        serverId: 'server-01',
        term: 2,
        requestId: 'rpc-01',
        ok: true,
        result: {
          clients: []
        },
        timestamp: Date.now()
      })
    )

    expect(response).toEqual(expect.objectContaining({
      type: 'clusterRpcResponse',
      clusterId: 'cluster-local',
      serverId: 'server-01',
      requestId: 'rpc-01',
      ok: true
    }))
  })
})

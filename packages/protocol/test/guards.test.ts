import { describe, expect, it } from 'vitest'

import {
  createSerializedError,
  isSkillPath,
  isStringRecord,
  parseClusterMessage,
  parseMessage
} from '../src/index.js'

const clientDescriptor = {
  id: 'client-01',
  name: 'Protocol Test Client',
  tools: [],
  prompts: [],
  skills: [],
  resources: []
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

  it('preserves skill content metadata on descriptors', () => {
    const message = parseMessage(
      JSON.stringify({
        type: 'registerClient',
        client: {
          ...clientDescriptor,
          skills: [
            {
              name: 'workspace/review',
              description: 'Review the workspace root.',
              contentType: 'text/markdown'
            }
          ]
        }
      })
    )

    expect(message).toEqual({
      type: 'registerClient',
      client: {
        ...clientDescriptor,
        skills: [
          {
            name: 'workspace/review',
            description: 'Review the workspace root.',
            contentType: 'text/markdown'
          }
        ]
      }
    })
  })

  it('parses client capability updates', () => {
    const message = parseMessage(
      JSON.stringify({
        type: 'updateClientCapabilities',
        clientId: 'client-01',
        capabilities: {
          tools: [
            {
              name: 'searchDom',
              description: 'Search the current page'
            }
          ],
          resources: [
            {
              uri: 'workspace://root/info',
              name: 'Workspace Info'
            }
          ]
        }
      })
    )

    expect(message).toEqual({
      type: 'updateClientCapabilities',
      clientId: 'client-01',
      capabilities: {
        tools: [
          {
            name: 'searchDom',
            description: 'Search the current page'
          }
        ],
        resources: [
          {
            uri: 'workspace://root/info',
            name: 'Workspace Info'
          }
        ]
      }
    })
  })

  it('rejects empty client capability updates', () => {
    expect(() =>
      parseMessage(
        JSON.stringify({
          type: 'updateClientCapabilities',
          clientId: 'client-01',
          capabilities: {}
        })
      )
    ).toThrow('Invalid MDP message')
  })

  it('rejects callClient messages without a name or uri target', () => {
    expect(() =>
      parseMessage(
        JSON.stringify({
          type: 'callClient',
          requestId: 'req-01',
          clientId: 'client-01',
          kind: 'tool'
        })
      )
    ).toThrow('Invalid MDP message')
  })

  it('rejects invalid skill paths', () => {
    expect(isSkillPath('workspace/review')).toBe(true)
    expect(isSkillPath('/workspace/review')).toBe(false)
    expect(isSkillPath('workspace//review')).toBe(false)
    expect(isSkillPath('workspace/../review')).toBe(false)
    expect(isSkillPath('workspace/review?topic=mdp')).toBe(false)

    expect(() =>
      parseMessage(
        JSON.stringify({
          type: 'registerClient',
          client: {
            ...clientDescriptor,
            skills: [
              {
                name: 'workspace/../review'
              }
            ]
          }
        })
      )
    ).toThrow('Invalid MDP message')

    expect(() =>
      parseMessage(
        JSON.stringify({
          type: 'updateClientCapabilities',
          clientId: 'client-01',
          capabilities: {
            skills: [
              {
                name: 'workspace/../review'
              }
            ]
          }
        })
      )
    ).toThrow('Invalid MDP message')

    expect(() =>
      parseMessage(
        JSON.stringify({
          type: 'callClient',
          requestId: 'req-04',
          clientId: 'client-01',
          kind: 'skill',
          name: 'workspace/review?topic=mdp'
        })
      )
    ).toThrow('Invalid MDP message')
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

  it('parses callClient auth envelopes', () => {
    const message = parseMessage(
      JSON.stringify({
        type: 'callClient',
        requestId: 'req-03',
        clientId: 'client-01',
        kind: 'tool',
        name: 'searchDom',
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
      kind: 'tool',
      name: 'searchDom',
      auth: {
        token: 'host-token',
        metadata: {
          requestId: 'trace-01'
        }
      }
    })
  })

  it('parses cluster control messages', () => {
    const message = parseClusterMessage(
      JSON.stringify({
        type: 'clusterHeartbeatAck',
        clusterId: 'cluster-local',
        serverId: 'server-01',
        term: 2,
        followerId: 'server-02',
        leaderId: 'server-01',
        timestamp: Date.now()
      })
    )

    expect(message).toEqual(expect.objectContaining({
      clusterId: 'cluster-local',
      type: 'clusterHeartbeatAck',
      serverId: 'server-01',
      term: 2,
      leaderId: 'server-01'
    }))
  })

  it('rejects malformed cluster control messages', () => {
    expect(() =>
      parseClusterMessage(
        JSON.stringify({
          type: 'clusterVoteRequest',
          serverId: 'server-02',
          term: '2',
          candidateId: 'server-02',
          candidateUrl: 'ws://127.0.0.1:47373',
          timestamp: Date.now()
        })
      )
    ).toThrow('Invalid MDP cluster message')
  })
})

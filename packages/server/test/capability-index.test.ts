import { describe, expect, it } from 'vitest'

import { type RegisteredClientSnapshot, CapabilityIndex } from '../src/capability-index.js'

function createSnapshot(
  id: string,
  name: string,
  overrides: Partial<RegisteredClientSnapshot['descriptor']> = {}
): RegisteredClientSnapshot {
  return {
    descriptor: {
      id,
      name,
      paths: [],
      ...overrides
    },
    connectedAt: new Date('2026-03-20T00:00:00.000Z'),
    lastSeenAt: new Date('2026-03-20T00:05:00.000Z'),
    connection: {
      mode: 'ws',
      secure: false,
      authSource: 'none'
    }
  }
}

describe('CapabilityIndex', () => {
  it('lists indexed paths and filters by client', () => {
    const index = new CapabilityIndex(() => [
      createSnapshot('client-01', 'Browser Client', {
        paths: [
          {
            type: 'endpoint',
            path: '/search',
            method: 'GET',
            description: 'Search the page'
          }
        ]
      }),
      createSnapshot('client-02', 'Native Client', {
        paths: [
          {
            type: 'endpoint',
            path: '/inspect',
            method: 'GET'
          }
        ]
      })
    ])

    expect(index.listPaths()).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'endpoint',
        path: '/search',
        method: 'GET',
        description: 'Search the page'
      },
      {
        clientId: 'client-02',
        clientName: 'Native Client',
        type: 'endpoint',
        path: '/inspect',
        method: 'GET'
      }
    ])
    expect(index.listPaths('client-01')).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'endpoint',
        path: '/search',
        method: 'GET',
        description: 'Search the page'
      }
    ])
  })

  it('checks and resolves path targets with params', () => {
    const index = new CapabilityIndex(() => [
      createSnapshot('client-01', 'Browser Client', {
        paths: [
          {
            type: 'endpoint',
            path: '/goods/:id',
            method: 'GET'
          },
          {
            type: 'prompt',
            path: '/goods/:id/prompt.md'
          }
        ]
      }),
      createSnapshot('client-02', 'Native Client', {
        paths: [
          {
            type: 'prompt',
            path: '/goods/:id/prompt.md'
          }
        ]
      })
    ])

    expect(
      index.hasTarget({
        clientId: 'client-01',
        method: 'GET',
        path: '/goods/sku-01'
      })
    ).toBe(true)
    expect(
      index.resolveTarget('client-01', 'GET', '/goods/sku-01')
    ).toEqual({
      descriptor: {
        type: 'endpoint',
        path: '/goods/:id',
        method: 'GET'
      },
      params: {
        id: 'sku-01'
      }
    })
    expect(
      index.findMatchingClientIds({
        method: 'GET',
        path: '/goods/sku-01/prompt.md'
      })
    ).toEqual(['client-01', 'client-02'])
  })

  it('preserves skill metadata and reports allowed methods', () => {
    const index = new CapabilityIndex(() => [
      createSnapshot('client-01', 'Browser Client', {
        paths: [
          {
            type: 'skill',
            path: '/workspace/review/skill.md',
            description: 'Review the workspace root.',
            contentType: 'text/markdown'
          }
        ]
      })
    ])

    expect(index.listPaths()).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'skill',
        path: '/workspace/review/skill.md',
        description: 'Review the workspace root.',
        contentType: 'text/markdown'
      }
    ])
    expect(
      index.resolveTarget('client-01', 'GET', '/workspace/review/skill.md')
    ).toEqual({
      descriptor: {
        type: 'skill',
        path: '/workspace/review/skill.md',
        description: 'Review the workspace root.',
        contentType: 'text/markdown'
      },
      params: {}
    })
    expect(
      index.listAllowedMethods('client-01', '/workspace/review/skill.md')
    ).toEqual(['GET'])
  })

  it('filters clients by case-insensitive search across client and path data', () => {
    const index = new CapabilityIndex(() => [
      createSnapshot('client-01', 'Browser Client', {
        description: 'Connected tab runtime',
        paths: [
          {
            type: 'endpoint',
            path: '/search',
            method: 'GET',
            description: 'Search the current page'
          }
        ]
      }),
      createSnapshot('client-02', 'Native Client', {
        paths: [
          {
            type: 'skill',
            path: '/workspace/review/files/skill.md',
            description: 'Review changed files'
          }
        ]
      })
    ])

    expect(index.listClients({ search: 'browser' })).toEqual([
      expect.objectContaining({
        id: 'client-01',
        name: 'Browser Client'
      })
    ])
    expect(index.listClients({ search: 'changed files' })).toEqual([
      expect.objectContaining({
        id: 'client-02',
        name: 'Native Client'
      })
    ])
  })

  it('defaults listPaths to one catalog layer and supports search and explicit depth', () => {
    const index = new CapabilityIndex(() => [
      createSnapshot('client-01', 'Browser Client', {
        paths: [
          {
            type: 'endpoint',
            path: '/workspace/info',
            method: 'GET'
          },
          {
            type: 'skill',
            path: '/workspace/review/skill.md',
            description: 'Review the workspace root.'
          },
          {
            type: 'skill',
            path: '/workspace/review/files/skill.md',
            description: 'Review changed files.'
          },
          {
            type: 'endpoint',
            path: '/workspace/review/files/download',
            method: 'POST',
            description: 'Download reviewed files.'
          }
        ]
      })
    ])

    expect(index.listPaths()).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'endpoint',
        path: '/workspace/info',
        method: 'GET'
      },
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'skill',
        path: '/workspace/review/skill.md',
        description: 'Review the workspace root.'
      }
    ])
    expect(index.listPaths({ depth: 2 })).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'endpoint',
        path: '/workspace/info',
        method: 'GET'
      },
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'skill',
        path: '/workspace/review/skill.md',
        description: 'Review the workspace root.'
      },
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'skill',
        path: '/workspace/review/files/skill.md',
        description: 'Review changed files.'
      },
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'endpoint',
        path: '/workspace/review/files/download',
        method: 'POST',
        description: 'Download reviewed files.'
      }
    ])
    expect(index.listPaths({ search: 'FILES' })).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'skill',
        path: '/workspace/review/files/skill.md',
        description: 'Review changed files.'
      },
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'endpoint',
        path: '/workspace/review/files/download',
        method: 'POST',
        description: 'Download reviewed files.'
      }
    ])
  })

  it('measures compat-wrapper depth from logical legacy paths instead of internal hash segments', () => {
    const index = new CapabilityIndex(() => [
      createSnapshot('client-01', 'Browser Client', {
        paths: [
          {
            type: 'endpoint',
            path: '/compat/tools/search-dom/83787a5f',
            method: 'POST',
            legacy: {
              kind: 'tool',
              name: 'searchDom'
            }
          },
          {
            type: 'prompt',
            path: '/compat/prompts/summarize-selection/02da729c/prompt.md',
            legacy: {
              kind: 'prompt',
              name: 'summarizeSelection'
            }
          },
          {
            type: 'skill',
            path: '/compat/skills/page/review/files/21ce2e13/skill.md',
            legacy: {
              kind: 'skill',
              name: 'page/review/files'
            }
          },
          {
            type: 'endpoint',
            path: '/compat/resources/webpage/active-tab/selection/abf7096f',
            method: 'GET',
            legacy: {
              kind: 'resource',
              uri: 'webpage://active-tab/selection',
              name: 'Active Selection'
            }
          }
        ]
      })
    ])

    expect(index.listPaths()).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'endpoint',
        path: '/compat/tools/search-dom/83787a5f',
        method: 'POST',
        legacy: {
          kind: 'tool',
          name: 'searchDom'
        }
      },
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'prompt',
        path: '/compat/prompts/summarize-selection/02da729c/prompt.md',
        legacy: {
          kind: 'prompt',
          name: 'summarizeSelection'
        }
      }
    ])
    expect(index.listPaths({ depth: 2 })).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'endpoint',
        path: '/compat/tools/search-dom/83787a5f',
        method: 'POST',
        legacy: {
          kind: 'tool',
          name: 'searchDom'
        }
      },
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'prompt',
        path: '/compat/prompts/summarize-selection/02da729c/prompt.md',
        legacy: {
          kind: 'prompt',
          name: 'summarizeSelection'
        }
      },
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'skill',
        path: '/compat/skills/page/review/files/21ce2e13/skill.md',
        legacy: {
          kind: 'skill',
          name: 'page/review/files'
        }
      },
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        type: 'endpoint',
        path: '/compat/resources/webpage/active-tab/selection/abf7096f',
        method: 'GET',
        legacy: {
          kind: 'resource',
          uri: 'webpage://active-tab/selection',
          name: 'Active Selection'
        }
      }
    ])
  })
})

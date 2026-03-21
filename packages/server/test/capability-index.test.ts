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
      tools: [],
      prompts: [],
      skills: [],
      resources: [],
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
  it('lists indexed tools and filters by client', () => {
    const index = new CapabilityIndex(() => [
      createSnapshot('client-01', 'Browser Client', {
        tools: [{ name: 'searchDom', description: 'Search the page' }]
      }),
      createSnapshot('client-02', 'Native Client', {
        tools: [{ name: 'inspectView' }]
      })
    ])

    expect(index.listTools()).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        name: 'searchDom',
        description: 'Search the page'
      },
      {
        clientId: 'client-02',
        clientName: 'Native Client',
        name: 'inspectView'
      }
    ])
    expect(index.listTools('client-01')).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        name: 'searchDom',
        description: 'Search the page'
      }
    ])
  })

  it('checks and resolves capability targets', () => {
    const index = new CapabilityIndex(() => [
      createSnapshot('client-01', 'Browser Client', {
        prompts: [{ name: 'summarizeSelection' }],
        resources: [{ uri: 'webpage://selection', name: 'Selection' }]
      }),
      createSnapshot('client-02', 'Native Client', {
        prompts: [{ name: 'summarizeSelection' }]
      })
    ])

    expect(
      index.hasTarget({
        clientId: 'client-01',
        kind: 'prompt',
        name: 'summarizeSelection'
      })
    ).toBe(true)
    expect(
      index.hasTarget({
        clientId: 'client-01',
        kind: 'resource',
        uri: 'webpage://selection'
      })
    ).toBe(true)
    expect(
      index.findMatchingClientIds({
        kind: 'prompt',
        name: 'summarizeSelection'
      })
    ).toEqual(['client-01', 'client-02'])
  })

  it('preserves skill content metadata in indexed skills', () => {
    const index = new CapabilityIndex(() => [
      createSnapshot('client-01', 'Browser Client', {
        skills: [
          {
            name: 'workspace/review',
            description: 'Review the workspace root.',
            contentType: 'text/markdown'
          }
        ]
      })
    ])

    expect(index.listSkills()).toEqual([
      {
        clientId: 'client-01',
        clientName: 'Browser Client',
        name: 'workspace/review',
        description: 'Review the workspace root.',
        contentType: 'text/markdown'
      }
    ])

    expect(index.getSkill('client-01', 'workspace/review')).toEqual({
      name: 'workspace/review',
      description: 'Review the workspace root.',
      contentType: 'text/markdown'
    })
  })
})

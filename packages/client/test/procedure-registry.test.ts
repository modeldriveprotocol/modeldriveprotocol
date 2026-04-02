import { describe, expect, it, vi } from 'vitest'

import { ProcedureRegistry } from '../src/procedure-registry.js'

describe('ProcedureRegistry', () => {
  it('describes exposed path nodes', () => {
    const registry = new ProcedureRegistry()

    registry
      .expose('/goods', {
        method: 'GET',
        description: 'List goods',
        inputSchema: {
          type: 'object'
        },
        outputSchema: {
          type: 'object'
        }
      }, async () => ({ list: [], total: 0 }))
      .expose(
        '/goods/skill.md',
        '# Goods\n\nRead `/goods` for the current goods list.'
      )
      .expose('/goods/prompt.md', {
        description: 'Build a goods summary prompt',
        inputSchema: {
          type: 'object'
        }
      }, async ({ queries }) => ({
        messages: [
          {
            role: 'user',
            content: `Summarize goods page ${queries.page ?? '1'}.`
          }
        ]
      }))

    const descriptor = registry.describe({
      id: 'client-01',
      name: 'Browser Client'
    })

    expect(descriptor.paths).toEqual([
      {
        type: 'endpoint',
        path: '/goods',
        method: 'GET',
        description: 'List goods',
        inputSchema: {
          type: 'object'
        },
        outputSchema: {
          type: 'object'
        }
      },
      {
        type: 'skill',
        path: '/goods/skill.md',
        description: 'Read `/goods` for the current goods list.',
        contentType: 'text/markdown'
      },
      {
        type: 'prompt',
        path: '/goods/prompt.md',
        description: 'Build a goods summary prompt',
        inputSchema: {
          type: 'object'
        }
      }
    ])
  })

  it('routes endpoint requests with params, queries, headers, and auth', async () => {
    const registry = new ProcedureRegistry()
    const handler = vi.fn(async ({ params, queries, headers }, context) => ({
      id: params.id,
      page: queries.page,
      trace: headers['x-trace-id'],
      authToken: context.auth?.token
    }))

    registry.expose('/goods/:id', {
      method: 'GET'
    }, handler)

    await expect(
      registry.invoke({
        requestId: 'req-01',
        clientId: 'client-01',
        method: 'GET',
        path: '/goods/sku-01',
        query: {
          page: 3
        },
        headers: {
          'x-trace-id': 'trace-01'
        },
        auth: {
          token: 'host-token'
        }
      })
    ).resolves.toEqual({
      id: 'sku-01',
      page: 3,
      trace: 'trace-01',
      authToken: 'host-token'
    })

    expect(handler).toHaveBeenCalledWith(
      {
        params: {
          id: 'sku-01'
        },
        queries: {
          page: 3
        },
        headers: {
          'x-trace-id': 'trace-01'
        }
      },
      {
        requestId: 'req-01',
        clientId: 'client-01',
        type: 'endpoint',
        method: 'GET',
        path: '/goods/sku-01',
        auth: {
          token: 'host-token'
        }
      }
    )
  })

  it('prefers static reserved leaf routes over param routes', async () => {
    const registry = new ProcedureRegistry()

    registry.expose('/goods/:id', {
      method: 'GET'
    }, async ({ params }) => ({
      type: 'endpoint',
      id: params.id
    }))
    registry.expose('/goods/skill.md', '# Goods Skill')

    await expect(
      registry.invoke({
        requestId: 'req-02',
        clientId: 'client-01',
        method: 'GET',
        path: '/goods/skill.md'
      })
    ).resolves.toBe('# Goods Skill')
  })

  it('wraps static prompt markdown as a prompt payload', async () => {
    const registry = new ProcedureRegistry()

    registry.expose('/goods/prompt.md', '# Goods Prompt')

    await expect(
      registry.invoke({
        requestId: 'req-03',
        clientId: 'client-01',
        method: 'GET',
        path: '/goods/prompt.md'
      })
    ).resolves.toEqual({
      messages: [
        {
          role: 'user',
          content: '# Goods Prompt'
        }
      ]
    })
  })

  it('routes all invocations through middleware and supports unexpose', async () => {
    const registry = new ProcedureRegistry()
    const events: string[] = []

    registry.useInvocationMiddleware(async (invocation, next) => {
      events.push(`before:${invocation.type}:${invocation.method}:${invocation.path}`)
      invocation.queries.page = 9
      const result = await next()
      events.push(`after:${JSON.stringify(result)}`)
      return result
    })

    registry.expose('/goods', {
      method: 'GET'
    }, async ({ queries }) => ({
      page: queries.page
    }))

    await expect(
      registry.invoke({
        requestId: 'req-04',
        clientId: 'client-01',
        method: 'GET',
        path: '/goods',
        query: {
          page: 1
        }
      })
    ).resolves.toEqual({
      page: 9
    })

    expect(events).toEqual([
      'before:endpoint:GET:/goods',
      'after:{"page":9}'
    ])

    expect(registry.unexpose('/goods', 'GET')).toBe(true)
    expect(() =>
      registry.invoke({
        requestId: 'req-05',
        clientId: 'client-01',
        method: 'GET',
        path: '/goods'
      })
    ).toThrow('Unknown path "/goods" for method "GET"')
  })
})

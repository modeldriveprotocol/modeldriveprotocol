import { describe, expect, it, vi } from 'vitest'

import { ProcedureRegistry } from '../src/procedure-registry.js'

describe('ProcedureRegistry', () => {
  it('describes all exposed capability kinds', () => {
    const registry = new ProcedureRegistry()

    registry
      .exposeTool('searchDom', async () => ({ matches: 1 }), {
        description: 'Search the page'
      })
      .exposePrompt('summarizeSelection', async () => ({
        messages: [{ role: 'user', content: 'Summarize' }]
      }))
      .exposeSkill(
        'page/review',
        '# Page Review\n\nReview the active page.\n\nYou can read `page/review/evidence` for deeper context.'
      )
      .exposeResource('webpage://selection', async () => ({
        mimeType: 'text/plain',
        text: 'Hello'
      }), {
        name: 'Selection',
        mimeType: 'text/plain'
      })

    const descriptor = registry.describe({
      id: 'client-01',
      name: 'Browser Client'
    })

    expect(descriptor.tools).toEqual([
      {
        name: 'searchDom',
        description: 'Search the page'
      }
    ])
    expect(descriptor.prompts).toEqual([
      {
        name: 'summarizeSelection'
      }
    ])
    expect(descriptor.skills).toEqual([
      {
        name: 'page/review',
        description: 'Review the active page.',
        contentType: 'text/markdown'
      }
    ])
    expect(descriptor.resources).toEqual([
      {
        uri: 'webpage://selection',
        name: 'Selection',
        mimeType: 'text/plain'
      }
    ])
  })

  it('routes invocation by capability kind', async () => {
    const toolHandler = vi.fn(async ({ query }, context) => ({
      query,
      matches: 3,
      authToken: context.auth?.token
    }))
    const skillMarkdown =
      '# Page Review\n\nReview the active page.\n\nYou can read `page/review/evidence` for deeper context.'
    const resourceHandler = vi.fn(async () => ({
      mimeType: 'text/plain',
      text: 'Selected text'
    }))
    const registry = new ProcedureRegistry()

    registry.exposeTool('searchDom', toolHandler)
    registry.exposeSkill('page/review', skillMarkdown)
    registry.exposeResource('webpage://selection', resourceHandler, {
      name: 'Selection'
    })

    await expect(
      registry.invoke({
        requestId: 'req-01',
        clientId: 'client-01',
        kind: 'tool',
        name: 'searchDom',
        args: { query: 'mdp' },
        auth: {
          token: 'host-token'
        }
      })
    ).resolves.toEqual({
      query: 'mdp',
      matches: 3,
      authToken: 'host-token'
    })
    await expect(
      registry.invoke({
        requestId: 'req-02',
        clientId: 'client-01',
        kind: 'skill',
        name: 'page/review'
      })
    ).resolves.toEqual(skillMarkdown)
    await expect(
      registry.invoke({
        requestId: 'req-015',
        clientId: 'client-01',
        kind: 'resource',
        uri: 'webpage://selection'
      })
    ).resolves.toEqual({
      mimeType: 'text/plain',
      text: 'Selected text'
    })

    expect(toolHandler).toHaveBeenCalledWith(
      { query: 'mdp' },
      {
        requestId: 'req-01',
        clientId: 'client-01',
        kind: 'tool',
        name: 'searchDom',
        auth: {
          token: 'host-token'
        }
      }
    )
    expect(resourceHandler).toHaveBeenCalledOnce()
  })

  it('invokes skill resolvers with query params and headers', async () => {
    const registry = new ProcedureRegistry()
    const skillResolver = vi.fn(async (query, headers) =>
      `# Query Skill\n\nquery=${query.q}\nheader=${headers['x-test-header']}`
    )

    registry.exposeSkill('docs/query', skillResolver)

    await expect(
      registry.invoke({
        requestId: 'req-20',
        clientId: 'client-01',
        kind: 'skill',
        name: 'docs/query',
        args: {
          query: {
            q: 'mdp'
          },
          headers: {
            'x-test-header': 'present'
          }
        }
      })
    ).resolves.toBe('# Query Skill\n\nquery=mdp\nheader=present')

    expect(skillResolver).toHaveBeenCalledWith(
      {
        q: 'mdp'
      },
      {
        'x-test-header': 'present'
      },
      expect.objectContaining({
        clientId: 'client-01',
        name: 'docs/query'
      })
    )
  })

  it('routes tool, prompt, skill, and resource invocations through middleware', async () => {
    const registry = new ProcedureRegistry()
    const events: string[] = []

    registry.useInvocationMiddleware(async (invocation, next) => {
      const target = invocation.name ?? invocation.uri ?? 'unknown'
      events.push(`before:${invocation.kind}:${target}`)
      const result = await next()
      events.push(`after:${invocation.kind}:${target}:${JSON.stringify(result)}`)
      return result
    })

    registry.exposeTool('searchDom', async ({ query }) => ({
      type: 'tool',
      query
    }))
    registry.exposePrompt('summarizeSelection', async ({ topic }) => ({
      type: 'prompt',
      topic
    }))
    registry.exposeSkill('workspace/review', '# Workspace Review')
    registry.exposeResource('webpage://selection', async () => ({
      type: 'resource'
    }), {
      name: 'Selection'
    })

    await expect(
      registry.invoke({
        requestId: 'req-tool',
        clientId: 'client-01',
        kind: 'tool',
        name: 'searchDom',
        args: {
          query: 'mdp'
        }
      })
    ).resolves.toEqual({
      type: 'tool',
      query: 'mdp'
    })
    await expect(
      registry.invoke({
        requestId: 'req-prompt',
        clientId: 'client-01',
        kind: 'prompt',
        name: 'summarizeSelection',
        args: {
          topic: 'selection'
        }
      })
    ).resolves.toEqual({
      type: 'prompt',
      topic: 'selection'
    })
    await expect(
      registry.invoke({
        requestId: 'req-skill',
        clientId: 'client-01',
        kind: 'skill',
        name: 'workspace/review'
      })
    ).resolves.toEqual('# Workspace Review')
    await expect(
      registry.invoke({
        requestId: 'req-resource',
        clientId: 'client-01',
        kind: 'resource',
        uri: 'webpage://selection'
      })
    ).resolves.toEqual({
      type: 'resource'
    })

    expect(events).toEqual([
      'before:tool:searchDom',
      'after:tool:searchDom:{"type":"tool","query":"mdp"}',
      'before:prompt:summarizeSelection',
      'after:prompt:summarizeSelection:{"type":"prompt","topic":"selection"}',
      'before:skill:workspace/review',
      'after:skill:workspace/review:"# Workspace Review"',
      'before:resource:webpage://selection',
      'after:resource:webpage://selection:{"type":"resource"}'
    ])
  })

  it('supports middleware chaining, argument rewrites, and short-circuit responses', async () => {
    const registry = new ProcedureRegistry()
    const calls: string[] = []

    registry.useInvocationMiddleware(async (invocation, next) => {
      calls.push(`outer:before:${invocation.name}`)

      if (invocation.name === 'searchDom') {
        invocation.args = {
          ...(invocation.args ?? {}),
          query: 'patched'
        }
      }

      const result = await next()
      calls.push(`outer:after:${JSON.stringify(result)}`)
      return result
    })
    registry.useInvocationMiddleware(async (invocation, next) => {
      calls.push(`inner:before:${invocation.name}`)

      if (invocation.name === 'cachedSearch') {
        calls.push('inner:short-circuit')
        return {
          query: 'cached',
          matches: 99
        }
      }

      const result = await next()
      calls.push(`inner:after:${JSON.stringify(result)}`)
      return result
    })

    const searchHandler = vi.fn(async ({ query }) => ({
      query,
      matches: 3
    }))
    const cachedHandler = vi.fn(async () => ({
      query: 'live',
      matches: 1
    }))

    registry.exposeTool('searchDom', searchHandler)
    registry.exposeTool('cachedSearch', cachedHandler)

    await expect(
      registry.invoke({
        requestId: 'req-30',
        clientId: 'client-01',
        kind: 'tool',
        name: 'searchDom',
        args: {
          query: 'original'
        }
      })
    ).resolves.toEqual({
      query: 'patched',
      matches: 3
    })
    await expect(
      registry.invoke({
        requestId: 'req-31',
        clientId: 'client-01',
        kind: 'tool',
        name: 'cachedSearch'
      })
    ).resolves.toEqual({
      query: 'cached',
      matches: 99
    })

    expect(searchHandler).toHaveBeenCalledWith(
      {
        query: 'patched'
      },
      expect.objectContaining({
        name: 'searchDom'
      })
    )
    expect(cachedHandler).not.toHaveBeenCalled()
    expect(calls).toEqual([
      'outer:before:searchDom',
      'inner:before:searchDom',
      'inner:after:{"query":"patched","matches":3}',
      'outer:after:{"query":"patched","matches":3}',
      'outer:before:cachedSearch',
      'inner:before:cachedSearch',
      'inner:short-circuit',
      'outer:after:{"query":"cached","matches":99}'
    ])
  })

  it('removes registered invocation middleware', async () => {
    const registry = new ProcedureRegistry()
    const middleware = vi.fn(async (_invocation, next) => next())

    registry.useInvocationMiddleware(middleware)
    expect(registry.removeInvocationMiddleware(middleware)).toBe(true)
    expect(registry.removeInvocationMiddleware(middleware)).toBe(false)

    registry.exposeTool('searchDom', async () => ({ matches: 1 }))

    await expect(
      registry.invoke({
        requestId: 'req-40',
        clientId: 'client-01',
        kind: 'tool',
        name: 'searchDom'
      })
    ).resolves.toEqual({
      matches: 1
    })

    expect(middleware).not.toHaveBeenCalled()
  })

  it('throws when the target key is missing or unknown', async () => {
    const registry = new ProcedureRegistry()

    await expect(
      registry.invoke({
        requestId: 'req-03',
        clientId: 'client-01',
        kind: 'tool'
      })
    ).rejects.toThrow('Missing tool key')

    await expect(
      registry.invoke({
        requestId: 'req-04',
        clientId: 'client-01',
        kind: 'tool',
        name: 'missingTool'
      })
    ).rejects.toThrow('Unknown tool "missingTool"')
  })

  it('rejects invalid skill paths at registration time', () => {
    const registry = new ProcedureRegistry()

    expect(() => registry.exposeSkill('workspace/../review', '# Invalid')).toThrow(
      'Invalid skill path "workspace/../review". Expected slash-separated lowercase segments using only a-z, 0-9, "-" and "_".'
    )
  })
})

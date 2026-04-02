---
title: MCP Definitions
status: Draft
---

# MCP Definitions

In the JavaScript SDK, you do not define MCP tools directly. You define MDP paths, and the server exposes those paths through a fixed MCP bridge surface.

## Endpoint definitions

Use `expose(path, descriptor, handler)` for regular callable endpoints.

```ts
client.expose(
  '/page/search',
  {
    method: 'POST',
    description: 'Search the current page',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    }
  },
  async ({ body }, context) => {
    const query = typeof body === 'object' && body !== null && !Array.isArray(body)
      ? String((body as { query?: unknown }).query ?? '')
      : ''

    return {
      query,
      matches: 3,
      authToken: context.auth?.token
    }
  }
)
```

Endpoint descriptors use:

- `path`
- `method`
- optional `description`
- optional `inputSchema`
- optional `outputSchema`
- optional `contentType`

## Prompt definitions

Use a reserved `.../prompt.md` path for prompt documents or prompt builders.

```ts
client.expose('/selection/summarize/prompt.md', {
  description: 'Build a summarization prompt'
}, async ({ queries }) => ({
  messages: [
    {
      role: 'user',
      content: `Summarize the active selection in a ${queries.tone ?? 'neutral'} tone.`
    }
  ]
}))
```

Prompt descriptors use:

- `path`
- optional `description`
- optional `inputSchema`
- optional `outputSchema`

## Legacy wrappers

The SDK still exposes `exposeTool()`, `exposePrompt()`, and `exposeResource()` as migration helpers. Those wrappers register compat paths and attach `legacy` aliases so the MCP bridge can continue serving `listTools`, `callTools`, `getPrompt`, and `readResource` for older hosts.

For new code, prefer `expose()` and path-native descriptors.

## How MCP sees these definitions

The canonical bridge tools are:

- `listClients`
- `listPaths`
- `callPath`
- `callPaths`

Compatibility aliases such as `listTools`, `callTools`, `listPrompts`, `getPrompt`, `listResources`, and `readResource` still exist while runtimes migrate.

If your runtime adds or removes descriptors after `register()`, update the local registry with `expose()` / `unexpose()`, then call `syncCatalog()` so the server refreshes its indexed path catalog.

For the wire model behind those definitions, see [Capability Model](/protocol/capability-model) and [MCP Bridge](/protocol/mcp-bridge).

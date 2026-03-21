---
title: MCP Definitions
status: Draft
---

# MCP Definitions

In the JavaScript SDK, you do not define MCP tools directly. You define MDP capability metadata, and the server exposes that metadata through a fixed MCP bridge surface.

## Tool definitions

Use `exposeTool(name, handler, options?)` to publish a callable tool.

```ts
client.exposeTool('searchDom', async ({ query }, context) => ({
  query,
  matches: 3,
  authToken: context.auth?.token
}), {
  description: 'Search the current page',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' }
    },
    required: ['query']
  }
})
```

Tool metadata maps to the protocol descriptor shape:

- `name`
- optional `description`
- optional `inputSchema`

## Prompt definitions

Use `exposePrompt(name, handler, options?)` when the runtime provides prompt templates or prompt builders.

```ts
client.exposePrompt('summarizeSelection', async () => ({
  messages: [{ role: 'user', content: 'Summarize the active selection.' }]
}), {
  description: 'Build a summarization prompt',
  arguments: [
    {
      name: 'tone',
      description: 'Desired summary tone',
      required: false
    }
  ]
})
```

Prompt metadata uses:

- `name`
- optional `description`
- optional `arguments`

## Resource definitions

Use `exposeResource(uri, handler, options)` for readable runtime state.

```ts
client.exposeResource('webpage://active-tab/page-info', async () => ({
  mimeType: 'application/json',
  text: JSON.stringify(
    {
      title: document.title,
      url: window.location.href
    },
    null,
    2
  )
}), {
  name: 'Current Page Info',
  mimeType: 'application/json'
})
```

Resource metadata uses:

- `uri`
- `name`
- optional `description`
- optional `mimeType`

## How MCP sees these definitions

The server keeps the MCP integration stable by exposing bridge tools such as `listTools`, `callTools`, `listPrompts`, `getPrompt`, `listResources`, and `readResource`.

For the wire model behind those definitions, see [Capability Model](/protocol/capability-model) and [MCP Bridge](/protocol/mcp-bridge).
